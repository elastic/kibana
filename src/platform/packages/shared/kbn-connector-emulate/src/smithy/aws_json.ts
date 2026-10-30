/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractRequest, ContractResponse, Violation } from '../contract/types';
import { isRecord } from '../openapi/schema_walk';
import type { JsonSchema, OpenApiDocument } from '../openapi/types';
import { createShapeConverter, isRequired } from './shape_schema';
import type { SmithyModel } from './smithy_model';
import {
  collectOperations,
  documentationOf,
  endpointPrefixOf,
  errorStatus,
  getShape,
  hasTrait,
  membersOf,
  pickService,
  protocolsOf,
  regionalServers,
  shapeName,
  sigv4Security,
  sigv4SecuritySchemes,
} from './smithy_model';

// https://smithy.io/2.0/aws/protocols/aws-json-1_0-protocol.html and its 1.1 counterpart.
const AWS_JSON_VERSIONS: Readonly<Record<string, string>> = {
  'aws.protocols#awsJson1_0': '1.0',
  'aws.protocols#awsJson1_1': '1.1',
};

/** Why the emulator rejected a request it routed, which awsJson answers with its own errors. */
export type AwsJsonRejection = 'unauthenticated' | 'invalid';

export type AwsJsonRoute =
  | { readonly operation: string; readonly request: ContractRequest }
  | { readonly response: ContractResponse; readonly violations: readonly Violation[] };

/** An AWS JSON RPC service, served through an OpenAPI document of its operations. */
export interface AwsJsonService {
  /**
   * An operation per Smithy operation, at `POST /<Operation>` on the regional host: the
   * operations fixtures, recordings and `calls` refer to.
   */
  readonly document: OpenApiDocument;
  /** Whether a URL is on one of the service's regional hosts, all of which it answers. */
  readonly matches: (url: URL) => boolean;
  /**
   * The operation a request's `X-Amz-Target` names, with the request moved to the operation's
   * path; or, for requests AWS would reject before reaching an operation, its error.
   */
  readonly route: (request: ContractRequest) => AwsJsonRoute;
  /** The error AWS answers when the request lacks credentials or breaks the input shape. */
  readonly reject: (
    rejection: AwsJsonRejection,
    violations: readonly Violation[]
  ) => ContractResponse;
  /** The response with AWS's content type. */
  readonly toResponse: (response: ContractResponse) => ContractResponse;
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether a model's service (the only one, or the given one) uses awsJson1_0 or awsJson1_1. */
export const isAwsJsonModel = (model: SmithyModel, service?: string): boolean =>
  protocolsOf(pickService(model, service)[1]).some((protocol) => protocol in AWS_JSON_VERSIONS);

/**
 * Serves a Smithy model of an AWS JSON RPC service (`awsJson1_0` or `awsJson1_1`), such as
 * CloudWatch or CloudWatch Logs. Requests are `POST /` to a regional host with the operation in
 * `X-Amz-Target` (`<Service>.<Operation>`) and the input as a JSON document by member name; the
 * operations go through the emulator like OpenAPI ones, so their input is validated and their
 * output comes from fixtures, recordings or samples. Errors are awsJson errors: `__type` and
 * `message` in the body.
 */
export const createAwsJsonService = (
  model: SmithyModel,
  { service: id }: { readonly service?: string } = {}
): AwsJsonService => {
  const [serviceId, service] = pickService(model, id);
  const protocol = protocolsOf(service).find((trait) => trait in AWS_JSON_VERSIONS);
  if (!protocol) {
    throw new Error(
      `${serviceId} uses neither aws.protocols#awsJson1_0 nor aws.protocols#awsJson1_1`
    );
  }
  const version = AWS_JSON_VERSIONS[protocol];
  const contentType = `application/x-amz-json-${version}`;
  const endpointPrefix = endpointPrefixOf(serviceId, service);
  // Operations with an `@endpoint` host prefix, such as `data.`, are served from a subdomain.
  const host = new RegExp(
    `^(?:[a-z0-9-]+\\.)*(${escapeRegExp(endpointPrefix)}\\.[a-z0-9-]+\\.amazonaws\\.com)$`
  );
  const targetPrefix = shapeName(serviceId);
  // awsJson documents name members as modeled, ignoring `@jsonName`.
  const converter = createShapeConverter(model, { jsonNames: false, nonNumericFloats: true });
  const { components } = converter;

  const resolveSchema = (schema: unknown, depth = 0): JsonSchema => {
    if (!isRecord(schema) || depth > 32) {
      return {};
    }
    if (typeof schema.$ref === 'string') {
      return resolveSchema(components[schema.$ref.split('/').pop() ?? ''], depth + 1);
    }
    return Array.isArray(schema.allOf) && schema.allOf.length === 1
      ? resolveSchema(schema.allOf[0], depth + 1)
      : schema;
  };

  // Servers treat null structure and union members as absent. Nulls in lists, sparse maps and
  // documents are values, and stay.
  const withoutNulls = (value: unknown, schema: unknown): unknown => {
    const target = resolveSchema(schema);
    if (Array.isArray(value)) {
      return value.map((item) => withoutNulls(item, target.items));
    }
    if (!isRecord(value)) {
      return value;
    }
    const variants = Array.isArray(target.oneOf)
      ? target.oneOf.map((variant) => resolveSchema(variant))
      : [];
    const isStructure = isRecord(target.properties) || variants.length > 0;
    const properties: Record<string, unknown> = isRecord(target.properties)
      ? target.properties
      : Object.assign({}, ...variants.map(({ properties: own }) => (isRecord(own) ? own : {})));
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, member]) =>
        isStructure
          ? member === null
            ? []
            : [[key, withoutNulls(member, properties[key])]]
          : [[key, withoutNulls(member, target.additionalProperties)]]
      )
    );
  };

  // A structure's members as a JSON document, registered as a component; error documents also
  // carry their `__type`.
  const toContentSchema = (
    shapeId: string | undefined,
    componentName: string,
    extra: Readonly<Record<string, JsonSchema>> = {}
  ): JsonSchema => {
    const { properties, ...schema } = converter.toObjectSchema(membersOf(model, shapeId));
    components[componentName] = {
      ...schema,
      properties: { ...(isRecord(properties) ? properties : {}), ...extra },
    };
    return { $ref: `#/components/schemas/${componentName}` };
  };

  // Bodies are AWS's media type, or `application/json` as CloudWatch's legacy form sends them;
  // samples take the first, which `toResponse` gives AWS's media type.
  const bothMediaTypes = (schema: JsonSchema) => ({
    'application/json': { schema },
    [contentType]: { schema },
  });

  const operations = new Set<string>();
  const paths: Record<string, unknown> = {};
  for (const operationId of collectOperations(model, serviceId)) {
    const operation = model.shapes[operationId];
    if (!operation) {
      continue;
    }
    const name = shapeName(operationId);
    operations.add(name);
    const input = toContentSchema(operation.input?.target, `${name}RequestContent`);
    const errors = new Map<string, JsonSchema[]>();
    for (const { target } of [...(operation.errors ?? []), ...(service.errors ?? [])]) {
      const code = errorStatus(getShape(model, target));
      const schema = toContentSchema(target, `${shapeName(target)}ResponseContent`, {
        __type: { type: 'string' },
      });
      errors.set(code, [...(errors.get(code) ?? []), schema]);
    }
    paths[`/${name}`] = {
      post: {
        operationId: name,
        ...documentationOf(operation),
        ...(hasTrait(operation.traits, 'smithy.api#deprecated') ? { deprecated: true } : {}),
        // Operations whose input has no required members take an empty body as well as `{}`.
        requestBody: {
          required: membersOf(model, operation.input?.target).some(([, member]) =>
            isRequired(member)
          ),
          content: bothMediaTypes(input),
        },
        responses: {
          '200': {
            description: `${name} 200 response`,
            content: bothMediaTypes(
              toContentSchema(operation.output?.target, `${name}ResponseContent`)
            ),
          },
          ...Object.fromEntries(
            [...errors].map(([code, schemas]) => [
              code,
              {
                description: `${code} response`,
                // Errors with only a `message` match several of their status' errors.
                content: bothMediaTypes(schemas.length === 1 ? schemas[0] : { anyOf: schemas }),
              },
            ])
          ),
        },
      },
    };
  }

  const error = (
    statusCode: number,
    type: string,
    violations: readonly Violation[]
  ): ContractResponse => ({
    statusCode,
    headers: { 'content-type': contentType },
    body: { __type: type, message: violations.map(({ message }) => message).join('; ') },
  });

  const rejected = (statusCode: number, type: string, path: string, message: string) => {
    const violations = [{ path: [path], code: type, message }];
    return { response: error(statusCode, type, violations), violations };
  };

  return {
    document: {
      openapi: '3.0.3',
      info: {
        title: String(service.traits?.['smithy.api#title'] ?? targetPrefix),
        version: service.version ?? '1',
      },
      servers: regionalServers(endpointPrefix),
      paths,
      components: { schemas: components, ...sigv4SecuritySchemes(service) },
      ...sigv4Security(service),
    },
    matches: (url) => host.test(url.hostname),
    route: (request) => {
      const { method, url, headers, body } = request;
      if (url.pathname !== '/') {
        return rejected(
          404,
          'UnknownOperationException',
          'path',
          `${protocol} requests are sent to /, not ${url.pathname}`
        );
      }
      if (method !== 'post') {
        return rejected(
          405,
          'UnknownOperationException',
          'method',
          `${protocol} requests use POST, not ${method.toUpperCase()}`
        );
      }
      // Parameters such as `charset` are ignored. CloudWatch's connector sends `application/json`
      // with `Content-Encoding: amz-1.0`, the legacy form of the protocol, which AWS accepts.
      const mediaType = (headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (mediaType !== contentType && mediaType !== 'application/json') {
        return rejected(
          400,
          'SerializationException',
          'content-type',
          `Expected Content-Type ${contentType}, not ${mediaType || 'none'}`
        );
      }
      const [prefix, name = ''] = (headers['x-amz-target'] ?? '').split(/\.(?=[^.]*$)/);
      if (prefix !== targetPrefix || !operations.has(name)) {
        return rejected(
          400,
          'UnknownOperationException',
          'x-amz-target',
          `X-Amz-Target ${
            headers['x-amz-target'] ?? '(none)'
          } names no operation; expected ${targetPrefix}.<Operation>`
        );
      }
      if (typeof body === 'string') {
        return rejected(400, 'SerializationException', 'body', 'The request body is not JSON');
      }
      // The document serves each operation at its path on the regional host.
      const routed = new URL(url);
      routed.hostname = host.exec(url.hostname)?.[1] ?? url.hostname;
      routed.pathname = `/${name}`;
      return {
        operation: name,
        request: {
          ...request,
          url: routed,
          body: withoutNulls(body, components[`${name}RequestContent`]),
        },
      };
    },
    reject: (rejection, violations) =>
      rejection === 'unauthenticated'
        ? error(403, 'MissingAuthenticationTokenException', violations)
        : error(400, 'ValidationException', violations),
    toResponse: (response) => {
      const current = response.headers?.['content-type'];
      return current === undefined || /^application\/json\b/.test(current)
        ? { ...response, headers: { ...response.headers, 'content-type': contentType } }
        : response;
    },
  };
};
