/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  if (!protocols.includes(REST_JSON)) {
    throw new Error(
      `${serviceId} uses ${
        protocols.join(', ') || 'no AWS protocol'
      }; convertSmithy supports ${REST_JSON}`
    );
  }
  const converter = createShapeConverter(model);
  const { components } = converter;
  const awsService = traitRecord(service.traits, 'aws.api#service');
  const sigv4 = traitRecord(service.traits, SIGV4);
  const endpointPrefix = String(
    awsService?.endpointPrefix ?? sigv4?.name ?? shapeName(serviceId).toLowerCase()
  );
  const serviceErrors = service.errors ?? [];

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
    if (target?.type === 'blob' || target?.type === 'string') {
      return {
        [typeof mediaType === 'string'
          ? mediaType
          : target.type === 'blob'
          ? 'application/octet-stream'
          : 'text/plain']: { schema: converter.toSchema(member.target, 'payload', member.traits) },
      };
    }
    return {
      'application/json': { schema: converter.toSchema(member.target, 'body', member.traits) },
    };
  };

  const toBodyContent = (
    members: Array<[string, MemberShape]>,
    componentName: string
  ): Node | undefined => {
    const payload = members.find(([, member]) => bindingOf(member) === 'smithy.api#httpPayload');
    if (payload) {
      return toPayloadContent(payload[1]);
    }
    const body = members.filter(([, member]) => bindingOf(member) === undefined);
    if (body.length === 0) {
      return undefined;
    }
    components[componentName] = converter.toObjectSchema(body);
    return { 'application/json': { schema: { $ref: `#/components/schemas/${componentName}` } } };
  };

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
    componentName: string
  ) => {
    const content = toBodyContent(members, componentName);
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
    greedy: ReadonlySet<string>
  ) => {
    const name = shapeName(id);
    const input = membersOf(model, operation.input?.target);
    const output = membersOf(model, operation.output?.target);
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
    const requestContent = toBodyContent(input, `${name}RequestContent`);
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
        if (body.length > 0) {
          const component = `${shapeName(target)}ResponseContent`;
          components[component] = converter.toObjectSchema(body);
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
                  'application/json': {
                    schema: schemas.length === 1 ? schemas[0] : { anyOf: schemas },
                  },
                },
              }
            : {}),
        },
      ];
    });

    const auth = operation.traits?.['smithy.api#auth'];
    return {
      operationId: name,
      ...documentationOf(operation),
      ...(hasTrait(operation.traits, 'smithy.api#deprecated') ? { deprecated: true } : {}),
      parameters,
      ...(requestBody ? { requestBody } : {}),
      responses: {
        [status]: toResponse(`${name} ${status} response`, output, `${name}ResponseContent`),
        ...Object.fromEntries(errorResponses),
      },
      ...(Array.isArray(auth) && auth.length === 0 ? { security: [] } : {}),
    };
  };

  const paths: Record<string, Node> = {};
  const msPaths: Record<string, Node> = {};
  for (const id of collectOperations(model, serviceId)) {
    const operation = model.shapes[id];
    const http = traitRecord(operation?.traits, 'smithy.api#http');
    if (!operation || !http || typeof http.uri !== 'string' || typeof http.method !== 'string') {
      continue;
    }
    // `{Key+}` labels may span segments.
    const greedy = new Set<string>();
    const uri = http.uri.replace(/\{([^}]+)\+\}/g, (_, label: string) => {
      greedy.add(label);
      return `{${label}}`;
    });
    // URIs such as `/2018-10-31/layers?find=LayerVersion` fix query parameters, which OpenAPI
    // paths can't express; AutoRest's `x-ms-paths` can.
    const target = uri.includes('?') ? msPaths : paths;
    const method = http.method.toLowerCase();
    target[uri] = { ...target[uri], [method]: toOperation(id, operation, http, greedy) };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: String(service.traits?.['smithy.api#title'] ?? shapeName(serviceId)),
      version: service.version ?? '1',
      ...documentationOf(service),
    },
    servers: [
      {
        url: `https://${endpointPrefix}.{region}.amazonaws.com`,
        variables: { region: { default: 'us-east-1' } },
      },
    ],
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
