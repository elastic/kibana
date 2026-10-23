/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRecord } from '../openapi/schema_walk';
import type { JsonSchema, OpenApiDocument } from '../openapi/types';
import type { Location } from './shape_schema';
import { createShapeConverter, isRequired } from './shape_schema';
import type { MemberShape, Shape, SmithyModel } from './smithy_model';
import {
  collectOperations,
  findServices,
  getShape,
  hasTrait,
  shapeName,
  traitRecord,
  UNIT,
} from './smithy_model';

const REST_JSON = 'aws.protocols#restJson1';
const REST_XML = 'aws.protocols#restXml';

// Services whose endpoint rules put a path label in the host: S3 addresses buckets as
// `{Bucket}.s3.{region}.amazonaws.com` (virtual-hosted) as well as by path.
const HOST_LABELS: Readonly<Record<string, string>> = { S3: 'Bucket' };
const SIGV4 = 'aws.auth#sigv4';
// The scheme name and shape smithy-openapi uses for SigV4.
const SIGV4_SCHEME = 'aws.auth.sigv4';

type Node = Record<string, unknown>;

export interface ConvertSmithyOptions {
  /** The service shape ID, for models that define more than one service. */
  readonly service?: string;
}

/** The members of a structure, by name. */
const membersOf = (model: SmithyModel, target: string | undefined): Array<[string, MemberShape]> =>
  target && target !== UNIT ? Object.entries(getShape(model, target)?.members ?? {}) : [];

const bindingOf = (member: MemberShape): string | undefined =>
  [
    'smithy.api#httpLabel',
    'smithy.api#httpQuery',
    'smithy.api#httpQueryParams',
    'smithy.api#httpHeader',
    'smithy.api#httpPrefixHeaders',
    'smithy.api#httpPayload',
    'smithy.api#httpResponseCode',
  ].find((trait) => hasTrait(member.traits, trait));

const documentationOf = (shape: { readonly traits?: Readonly<Record<string, unknown>> }) => {
  const documentation = shape.traits?.['smithy.api#documentation'];
  return typeof documentation === 'string' ? { description: documentation } : {};
};

/** The status of an error shape: its `@httpError`, or 400 for client and 500 for server errors. */
const errorStatus = (shape: Shape | undefined): string => {
  const code = shape?.traits?.['smithy.api#httpError'];
  if (typeof code === 'number') {
    return String(code);
  }
  return shape?.traits?.['smithy.api#error'] === 'server' ? '500' : '400';
};

const pickService = (model: SmithyModel, id?: string): [string, Shape] => {
  const services = findServices(model);
  const service = id ? services.find(([serviceId]) => serviceId === id) : services[0];
  if (!service || (!id && services.length > 1)) {
    throw new Error(
      id
        ? `The model has no service ${id}`
        : `Expected one service in the model, found ${
            services.map(([serviceId]) => serviceId).join(', ') || 'none'
          }; pass the service to convert`
    );
  }
  return service;
};

/**
 * Converts a Smithy model of an AWS `restJson1` service to OpenAPI 3.0, as `convertDiscovery`
 * does for Google's APIs. Operations, bound to the service directly or through its resources,
 * get their method and path from `@http` (greedy labels such as `{Key+}` may span segments, and
 * paths with fixed query parameters go under `x-ms-paths`); members become path, query and
 * header parameters by their binding traits, the `@httpPayload`, or the JSON body; and modeled
 * errors become responses at their `@httpError` status. Requests are served from the regional
 * endpoint, `https://{endpointPrefix}.{region}.amazonaws.com`, and must carry an
 * `Authorization` header when the service uses SigV4.
 */
export const convertSmithy = (
  model: SmithyModel,
  options: ConvertSmithyOptions = {}
): OpenApiDocument => {
  const [serviceId, service] = pickService(model, options.service);
  const protocols = Object.keys(service.traits ?? {}).filter((trait) =>
    trait.startsWith('aws.protocols#')
  );
  if (!protocols.includes(REST_JSON) && !protocols.includes(REST_XML)) {
    throw new Error(
      `${serviceId} uses ${
        protocols.join(', ') || 'no AWS protocol'
      }; convertSmithy supports ${REST_JSON} and ${REST_XML}`
    );
  }
  const xml = !protocols.includes(REST_JSON);
  const documentType = xml ? 'application/xml' : 'application/json';
  // S3 writes errors as a bare `<Error>`, not inside `<ErrorResponse>`.
  const noErrorWrapping = traitRecord(service.traits, REST_XML)?.noErrorWrapping === true;
  const serviceNamespace = traitRecord(service.traits, 'smithy.api#xmlNamespace');
  const converter = createShapeConverter(model, { xml, nonNumericFloats: xml });
  const { components } = converter;
  const awsService = traitRecord(service.traits, 'aws.api#service');
  const sigv4 = traitRecord(service.traits, SIGV4);
  const endpointPrefix = String(
    awsService?.endpointPrefix ?? sigv4?.name ?? shapeName(serviceId).toLowerCase()
  );
  const serviceErrors = service.errors ?? [];
  const hostLabel = HOST_LABELS[String(awsService?.sdkId)];
  const regionalServer = {
    url: `https://${endpointPrefix}.{region}.amazonaws.com`,
    variables: { region: { default: 'us-east-1' } },
  };

  // The root element of an XML document: its name and the service's namespace, unless the
  // shape has its own.
  const toXmlRoot = (shapeId: string | undefined, schema: JsonSchema): JsonSchema => {
    if (!xml) {
      return schema;
    }
    const shape = shapeId ? getShape(model, shapeId) : undefined;
    const xmlName = shape?.traits?.['smithy.api#xmlName'];
    const namespace = traitRecord(shape?.traits, 'smithy.api#xmlNamespace') ?? serviceNamespace;
    return {
      ...schema,
      xml: {
        ...(shapeId ? { name: typeof xmlName === 'string' ? xmlName : shapeName(shapeId) } : {}),
        ...(typeof namespace?.uri === 'string' ? { namespace: namespace.uri } : {}),
        ...(typeof namespace?.prefix === 'string' ? { prefix: namespace.prefix } : {}),
      },
    };
  };

  // restXml errors: `<ErrorResponse><Error>` with the error's `Type`, `Code` and members, and a
  // `RequestId` (https://smithy.io/2.0/aws/protocols/aws-restxml-protocol.html).
  const toXmlError = (target: string, body: Array<[string, MemberShape]>): JsonSchema => {
    const fields = converter.toObjectSchema(body);
    const error = {
      type: 'object',
      properties: {
        Type: { type: 'string', enum: ['Sender', 'Receiver'] },
        Code: { type: 'string', enum: [shapeName(target)] },
        Message: { type: 'string' },
        ...(isRecord(fields.properties) ? fields.properties : {}),
      },
      required: ['Code', ...(Array.isArray(fields.required) ? fields.required : [])],
    };
    return noErrorWrapping
      ? { ...error, xml: { name: 'Error' } }
      : {
          type: 'object',
          xml: { name: 'ErrorResponse' },
          properties: { Error: error, RequestId: { type: 'string' } },
          required: ['Error'],
        };
  };

  const toParameter = (
    name: string,
    location: 'path' | 'query' | 'header',
    member: MemberShape,
    schemaLocation: Location
  ): Node => ({
    name,
    in: location,
    required: location === 'path' || isRequired(member),
    ...documentationOf(member),
    schema: converter.toSchema(member.target, schemaLocation, member.traits),
  });

  // An `@httpPayload` member is the whole body: a structure, union or document as JSON, a blob
  // or string as its `@mediaType`, and an event stream as AWS's binary event stream encoding.
  const toPayloadContent = (member: MemberShape): Node => {
    const target = getShape(model, member.target);
    const mediaType = target?.traits?.['smithy.api#mediaType'];
    if (target?.type === 'union' && hasTrait(target.traits, 'smithy.api#streaming')) {
      return {
        'application/vnd.amazon.eventstream': { schema: { type: 'string', format: 'binary' } },
      };
    }
    if (target?.type === 'blob' || target?.type === 'string' || target?.type === 'enum') {
      return {
        [typeof mediaType === 'string'
          ? mediaType
          : target.type === 'blob'
          ? 'application/octet-stream'
          : 'text/plain']: { schema: converter.toSchema(member.target, 'payload', member.traits) },
      };
    }
    const schema = converter.toSchema(member.target, 'body', member.traits);
    // The target's own `xml` names the root, unless the member renames it; the wrapper adds
    // the service's namespace.
    const memberXmlName = member.traits?.['smithy.api#xmlName'];
    const root = toXmlRoot(undefined, {});
    return {
      [documentType]: {
        schema:
          xml && '$ref' in schema
            ? {
                allOf: [schema],
                xml: {
                  ...(isRecord(root.xml) ? root.xml : {}),
                  ...(typeof memberXmlName === 'string' ? { name: memberXmlName } : {}),
                },
              }
            : schema,
      },
    };
  };

  const toBodyContent = (
    members: Array<[string, MemberShape]>,
    componentName: string,
    shapeId?: string,
    unwrapped = false
  ): Node | undefined => {
    const payload = members.find(([, member]) => bindingOf(member) === 'smithy.api#httpPayload');
    if (payload) {
      return toPayloadContent(payload[1]);
    }
    const body = members.filter(([, member]) => bindingOf(member) === undefined);
    if (body.length === 0) {
      return undefined;
    }
    // S3's `@s3UnwrappedXmlOutput` operations answer with their one member as the root,
    // such as GetBucketLocation's `<LocationConstraint>us-west-2</LocationConstraint>`.
    if (unwrapped && body.length === 1) {
      const [[memberName, member]] = body;
      const xmlName = member.traits?.['smithy.api#xmlName'];
      const schema = converter.toSchema(member.target, 'body', member.traits);
      return {
        [documentType]: {
          schema: {
            allOf: [schema],
            xml: {
              name: typeof xmlName === 'string' ? xmlName : memberName,
              ...(typeof serviceNamespace?.uri === 'string'
                ? { namespace: serviceNamespace.uri }
                : {}),
            },
          },
        },
      };
    }
    components[componentName] = toXmlRoot(shapeId, converter.toObjectSchema(body));
    return { [documentType]: { schema: { $ref: `#/components/schemas/${componentName}` } } };
  };

  // Query and label bindings don't apply to responses, so those members are in the body.
  const forResponse = (members: Array<[string, MemberShape]>): Array<[string, MemberShape]> =>
    members.map(([name, member]) => {
      const binding = bindingOf(member);
      if (
        binding !== 'smithy.api#httpQuery' &&
        binding !== 'smithy.api#httpQueryParams' &&
        binding !== 'smithy.api#httpLabel'
      ) {
        return [name, member];
      }
      const { [binding]: _, ...traits } = member.traits ?? {};
      return [name, { ...member, traits }];
    });

  const toHeaders = (members: Array<[string, MemberShape]>): Node =>
    Object.fromEntries(
      members
        .filter(([, member]) => bindingOf(member) === 'smithy.api#httpHeader')
        .map(([, member]) => [
          String(member.traits?.['smithy.api#httpHeader']),
          {
            ...documentationOf(member),
            schema: converter.toSchema(member.target, 'header', member.traits),
          },
        ])
    );

  const toResponse = (
    description: string,
    members: Array<[string, MemberShape]>,
    componentName: string,
    shapeId?: string,
    unwrapped = false
  ) => {
    const content = toBodyContent(members, componentName, shapeId, unwrapped);
    const headers = toHeaders(members);
    return {
      description,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      ...(content ? { content } : {}),
    };
  };

  const toOperation = (
    id: string,
    operation: Shape,
    http: Record<string, unknown>,
    greedy: ReadonlySet<string>,
    uri: string
  ) => {
    const name = shapeName(id);
    // Operations on a host label, such as S3's bucket operations, are also served from a host
    // with the label in it; the label's value fills the path parameter.
    // S3 Express's control operations, such as `ListDirectoryBuckets`, have a host of their own.
    const expressControl =
      traitRecord(
        traitRecord(operation.traits, 'smithy.rules#staticContextParams'),
        'UseS3ExpressControlEndpoint'
      )?.value === true;
    // `@endpoint` host prefixes such as `data.` or `{AccountId}.`, whose labels are server
    // variables here.
    const hostPrefix = traitRecord(operation.traits, 'smithy.api#endpoint')?.hostPrefix;
    const prefixedServer =
      typeof hostPrefix === 'string'
        ? {
            url: `https://${hostPrefix}${endpointPrefix}.{region}.amazonaws.com`,
            variables: Object.fromEntries([
              ...[...hostPrefix.matchAll(/\{([^}]+)\}/g)].map(([, label]) => [
                label,
                { default: 'example' },
              ]),
              ['region', { default: 'us-east-1' }],
            ]),
          }
        : undefined;
    const servers = prefixedServer
      ? [prefixedServer]
      : expressControl
      ? [
          {
            url: `https://${endpointPrefix}express-control.{region}.amazonaws.com`,
            variables: { region: { default: 'us-east-1' } },
          },
        ]
      : hostLabel && uri.startsWith(`/{${hostLabel}}`)
      ? [
          // Regional, dual-stack (IPv6) and Transfer Acceleration hosts.
          ...[
            `${endpointPrefix}.{region}`,
            `${endpointPrefix}.dualstack.{region}`,
            `${endpointPrefix}-accelerate`,
            `${endpointPrefix}-accelerate.dualstack`,
          ].map((host) => ({
            url: `https://{${hostLabel}}.${host}.amazonaws.com`,
            variables: {
              [hostLabel]: { default: 'example', 'x-path-parameter': true },
              ...(host.includes('{region}') ? { region: { default: 'us-east-1' } } : {}),
            },
          })),
          regionalServer,
        ]
      : undefined;
    const input = membersOf(model, operation.input?.target);
    const output = forResponse(membersOf(model, operation.output?.target));
    const parameters = input.flatMap(([memberName, member]): Node[] => {
      const traits = member.traits ?? {};
      switch (bindingOf(member)) {
        case 'smithy.api#httpLabel':
          return [
            {
              ...toParameter(memberName, 'path', member, 'label'),
              // Read by the operation loader, as for Azure's specs.
              ...(greedy.has(memberName) ? { 'x-ms-skip-url-encoding': true } : {}),
            },
          ];
        case 'smithy.api#httpQuery':
          return [toParameter(String(traits['smithy.api#httpQuery']), 'query', member, 'query')];
        case 'smithy.api#httpQueryParams':
          return [
            {
              ...toParameter(memberName, 'query', member, 'query'),
              style: 'form',
              explode: true,
            },
          ];
        case 'smithy.api#httpHeader':
          return [toParameter(String(traits['smithy.api#httpHeader']), 'header', member, 'header')];
        default:
          return [];
      }
    });
    const requestContent = toBodyContent(input, `${name}RequestContent`, operation.input?.target);
    const requestBody = requestContent && {
      required: input.some(
        ([, member]) =>
          isRequired(member) &&
          (bindingOf(member) === undefined || bindingOf(member) === 'smithy.api#httpPayload')
      ),
      content: requestContent,
    };

    const status = String(typeof http.code === 'number' ? http.code : 200);
    const errors = new Map<string, string[]>();
    for (const { target } of [...(operation.errors ?? []), ...serviceErrors]) {
      const code = errorStatus(getShape(model, target));
      errors.set(code, [...(errors.get(code) ?? []), target]);
    }
    // Errors that share a status are alternatives, as an `anyOf`: bodies with only a `message`
    // match several of them. smithy-openapi keeps only the last one.
    const errorResponses = [...errors].map(([code, targets]) => {
      const schemas: JsonSchema[] = [];
      let headers: Node = {};
      for (const target of targets) {
        const members = membersOf(model, target);
        const body = members.filter(([, member]) => bindingOf(member) === undefined);
        headers = { ...headers, ...toHeaders(members) };
        if (body.length > 0 || xml) {
          const component = `${shapeName(target)}ResponseContent`;
          components[component] = xml ? toXmlError(target, body) : converter.toObjectSchema(body);
          schemas.push({ $ref: `#/components/schemas/${component}` });
        }
      }
      return [
        code,
        {
          description: `${targets.map(shapeName).join(', ')} ${code} response`,
          ...(Object.keys(headers).length > 0 ? { headers } : {}),
          ...(schemas.length > 0
            ? {
                content: {
                  [documentType]: {
                    schema: schemas.length === 1 ? schemas[0] : { anyOf: schemas },
                  },
                },
              }
            : {}),
        },
      ];
    });

    const success = toResponse(
      `${name} ${status} response`,
      output,
      `${name}ResponseContent`,
      operation.output?.target,
      hasTrait(operation.traits, 'aws.customizations#s3UnwrappedXmlOutput')
    );
    const auth = operation.traits?.['smithy.api#auth'];
    return {
      operationId: name,
      ...documentationOf(operation),
      ...(hasTrait(operation.traits, 'smithy.api#deprecated') ? { deprecated: true } : {}),
      parameters,
      ...(requestBody ? { requestBody } : {}),
      responses: {
        [status]: success,
        // An `@httpResponseCode` member lets the operation answer with another 2xx status.
        ...(output.some(([, member]) => bindingOf(member) === 'smithy.api#httpResponseCode')
          ? { '2XX': success }
          : {}),
        ...Object.fromEntries(errorResponses),
      },
      ...(Array.isArray(auth) && auth.length === 0 ? { security: [] } : {}),
      ...(servers ? { servers } : {}),
      // S3's `x-id` query parameters only tell SDKs' routers apart; S3 doesn't require them.
      ...(/[?&]x-id=/.test(uri) ? { 'x-optional-fixed-query': ['x-id'] } : {}),
    };
  };

  const paths: Record<string, Node> = {};
  const msPaths: Record<string, Node> = {};
  for (const id of collectOperations(model, serviceId)) {
    const operation = getShape(model, id);
    const http = traitRecord(operation?.traits, 'smithy.api#http');
    if (!operation || !http || typeof http.uri !== 'string' || typeof http.method !== 'string') {
      continue;
    }
    // `{Key+}` labels may span segments.
    const greedy = new Set<string>();
    const labeled = http.uri.replace(/\{([^}]+)\+\}/g, (_, label: string) => {
      greedy.add(label);
      return `{${label}}`;
    });
    const uri = labeled;
    // URIs such as `/2018-10-31/layers?find=LayerVersion` fix query parameters, which OpenAPI
    // paths can't express; AutoRest's `x-ms-paths` can.
    const target = uri.includes('?') ? msPaths : paths;
    const method = http.method.toLowerCase();
    target[uri] = { ...target[uri], [method]: toOperation(id, operation, http, greedy, uri) };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: String(service.traits?.['smithy.api#title'] ?? shapeName(serviceId)),
      version: service.version ?? '1',
      ...documentationOf(service),
    },
    servers: [regionalServer],
    paths,
    ...(Object.keys(msPaths).length > 0 ? { 'x-ms-paths': msPaths } : {}),
    components: {
      schemas: components,
      ...(sigv4
        ? {
            securitySchemes: {
              [SIGV4_SCHEME]: {
                type: 'apiKey',
                description: 'AWS Signature Version 4 authentication',
                name: 'Authorization',
                in: 'header',
                'x-amazon-apigateway-authtype': 'awsSigv4',
              },
            },
          }
        : {}),
    },
    ...(sigv4 ? { security: [{ [SIGV4_SCHEME]: [] }] } : {}),
  };
};
