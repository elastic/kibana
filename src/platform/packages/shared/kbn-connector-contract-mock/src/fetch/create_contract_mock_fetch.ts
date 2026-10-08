/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ContractProtocol,
  ContractRequest,
  ContractResponse,
  NamedOperationRef,
  Responder,
  Violation,
} from '../contract/types';
import type {
  OperationRef,
  Recording,
  RejectedResponse,
  ResponseFixture,
} from '../engine/response_engine';
import { createResponseEngine } from '../engine/response_engine';
import type { PaginationOptions } from '../engine/paginate';
import { withPagination } from '../engine/paginate';
import { sampleResponse } from '../engine/sample_response';
import type { GraphQLSpec } from '../graphql/graphql_protocol';
import { createGraphQLProtocol, isGraphQLSpec, toEndpoint } from '../graphql/graphql_protocol';
import type { ContractOperation, OpenApiDocument } from '../openapi';
import { loadContractOperations } from '../openapi';
import { createOpenApiAdapter } from '../openapi/openapi_adapter';
import { findTokenEndpoints, respondToTokenRequest } from '../openapi/token_endpoints';

/** One request the mock received, for assertions in tests. */
export interface ContractCall {
  /** `METHOD url` as the connector sent it, without the query string. */
  readonly request: string;
  /** The matched operation's `operationId`, or `METHOD /path` when it has none. */
  readonly operation?: string;
  /**
   * The matched operation: its method (lowercase) and path template, or its name for protocols
   * such as GraphQL; and, for named specs, the spec's name.
   */
  readonly matched?: OperationRef | NamedOperationRef;
  /** Set for named operations: whether the operation only reads, e.g. a GraphQL query. */
  readonly readOnly?: boolean;
  /** Set for requests to the token URL of an OAuth 2 flow, which the mock answers itself. */
  readonly token?: true;
  readonly status: number;
  readonly requestViolations: readonly Violation[];
  readonly responseViolations: readonly Violation[];
}

/** An OpenAPI document, or a spec of a protocol with its own endpoints, such as GraphQL. */
export type ContractMockSpec = OpenApiDocument | GraphQLSpec;

export interface ContractMockOptions extends PaginationOptions {
  /**
   * The vendor specs the connector targets, e.g. both API versions it calls. Named specs (such
   * as `{ v1, v2 }`) let `calls`, fixtures, recordings and pagination tell their operations apart.
   */
  readonly specs: readonly ContractMockSpec[] | Readonly<Record<string, ContractMockSpec>>;
  /** Hand-written responses, served in preference to everything else. */
  readonly fixtures?: readonly ResponseFixture[];
  /** Responses captured from the vendor, served when they still conform to the spec. */
  readonly recordings?: readonly Recording[];
  /**
   * Answers operations without a fixture or recording; defaults to the spec's examples,
   * then deterministic samples of its schemas.
   */
  readonly respond?: Responder;
}

export interface ContractMock {
  readonly fetch: typeof fetch;
  readonly calls: ContractCall[];
  /** Fixtures and recordings that aren't served because the spec contradicts them. */
  readonly rejectedResponses: readonly RejectedResponse[];
}

const JSON_HEADERS = { 'content-type': 'application/json' };

const toQuery = (params: URLSearchParams): Record<string, string | string[]> => {
  const query: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    query[key] = values.length === 1 ? values[0] : values;
  }
  return query;
};

const toContractRequest = async (request: Request): Promise<ContractRequest> => {
  const url = new URL(request.url);
  const headers: Record<string, string> = Object.fromEntries(request.headers);
  // Read unconditionally: fetch polyfills such as whatwg-fetch (Kibana's jsdom preset) leave
  // `request.body` undefined even when the request has one.
  const text = await request.text();
  let body: unknown = text || undefined;
  if (text) {
    headers['content-length'] ??= String(Buffer.byteLength(text));
    if (/json/.test(headers['content-type'] ?? '')) {
      try {
        body = JSON.parse(text);
      } catch {
        // Left as a string so validation reports it against the JSON schema.
      }
    }
  }
  return {
    method: request.method.toLowerCase(),
    url,
    query: toQuery(url.searchParams),
    headers,
    body,
  };
};

const isSpecList = (specs: ContractMockOptions['specs']): specs is readonly ContractMockSpec[] =>
  Array.isArray(specs);

const toNamedSpecs = (
  specs: ContractMockOptions['specs']
): Array<readonly [string | undefined, ContractMockSpec]> =>
  isSpecList(specs) ? specs.map((spec) => [undefined, spec] as const) : Object.entries(specs);

// Loading copies and normalizes the document, which takes seconds and gigabytes for specs such
// as Microsoft Graph, so mocks created from the same document share its operations.
const loadedSpecs = new WeakMap<OpenApiDocument, Map<string | undefined, ContractOperation[]>>();

const loadSpec = (document: OpenApiDocument, source?: string): ContractOperation[] => {
  const bySource = loadedSpecs.get(document) ?? new Map();
  loadedSpecs.set(document, bySource);
  const operations = bySource.get(source) ?? loadContractOperations(document, source);
  bySource.set(source, operations);
  return operations;
};

const loadSpecs = (specs: ContractMockOptions['specs']): ContractOperation[] =>
  toNamedSpecs(specs).flatMap(([source, spec]) =>
    isGraphQLSpec(spec) ? [] : loadSpec(spec, source)
  );

const loadProtocols = (specs: ContractMockOptions['specs']): Map<string, ContractProtocol> => {
  const protocols = new Map<string, ContractProtocol>();
  for (const [source, spec] of toNamedSpecs(specs)) {
    if (isGraphQLSpec(spec)) {
      const protocol = createGraphQLProtocol(spec, source);
      protocol.endpoints.forEach((endpoint) => protocols.set(endpoint, protocol));
    }
  }
  return protocols;
};

const toOperationRef = ({ method, path, spec: { source } }: ContractOperation): OperationRef => ({
  method,
  path,
  ...(source === undefined ? {} : { source }),
});

// HTTP sends no body with these, though specs such as Jira's declare content for 204 responses.
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

const toResponse = ({ statusCode, headers, body }: ContractResponse): Response => {
  const payload =
    body === undefined || body === null || NULL_BODY_STATUSES.has(statusCode)
      ? null
      : typeof body === 'string'
      ? body
      : JSON.stringify(body);
  return new Response(payload, { status: statusCode, headers: { ...headers } });
};

/**
 * Creates a `fetch` that answers requests in-process from a vendor spec. Unmatched requests
 * get 404, requests without the credentials the operation requires get 401, and requests that
 * break the spec get 422 listing the violations; every request is recorded in `calls`. The
 * token URLs of the specs' OAuth 2 flows issue stub tokens, and GraphQL specs answer at their
 * endpoints. Axios clients can use it with `{ adapter: 'fetch', env: { fetch } }`.
 */
export const createContractMockFetch = ({
  specs,
  fixtures,
  recordings,
  pagination,
  collectionSize,
  respond = sampleResponse,
}: ContractMockOptions): ContractMock => {
  const operations = loadSpecs(specs);
  const protocols = loadProtocols(specs);
  const tokenEndpoints = findTokenEndpoints(operations);
  const engine = createResponseEngine(operations, { fixtures, recordings, fallback: respond });
  const contract = createOpenApiAdapter(
    operations,
    withPagination(
      operations,
      { pagination, collectionSize, recordedExchanges: engine.recordedExchanges },
      engine.respond
    )
  );
  const calls: ContractCall[] = [];

  const handle = async (request: ContractRequest): Promise<ContractResponse> => {
    const description = `${request.method.toUpperCase()} ${request.url.origin}${
      request.url.pathname
    }`;
    const protocol = protocols.get(toEndpoint(request.url));
    if (protocol) {
      const { response, operations: called, requestViolations } = await protocol.handle(request);
      const base = { request: description, status: response.statusCode, requestViolations };
      if (called.length === 0) {
        calls.push({ ...base, responseViolations: [] });
      }
      for (const { name, source, readOnly } of called) {
        const matched = { name, ...(source === undefined ? {} : { source }) };
        calls.push({ ...base, operation: name, matched, readOnly, responseViolations: [] });
      }
      return response;
    }
    const routed = contract.route(request);
    const grants = tokenEndpoints.get(`${request.url.origin}${request.url.pathname}`);
    if (!('operation' in routed) && grants) {
      const response = respondToTokenRequest(grants, request);
      calls.push({
        request: description,
        operation: 'OAuth token',
        token: true,
        status: response.statusCode,
        requestViolations: [],
        responseViolations: [],
      });
      return response;
    }
    if (!('operation' in routed)) {
      calls.push({
        request: description,
        status: routed.status,
        requestViolations: [],
        responseViolations: [],
      });
      const body = { title: 'No matching operation', detail: `${description}: ${routed.message}` };
      return { statusCode: routed.status, headers: JSON_HEADERS, body };
    }

    const { operation } = routed;
    const name = operation.id;
    const matched = toOperationRef(operation);
    const authViolations = contract.authenticate(routed, request);
    const requestViolations =
      authViolations.length > 0 ? authViolations : contract.validateRequest(routed, request);
    if (requestViolations.length > 0) {
      const statusCode = authViolations.length > 0 ? 401 : 422;
      calls.push({
        request: description,
        operation: name,
        matched,
        status: statusCode,
        requestViolations,
        responseViolations: [],
      });
      return {
        statusCode,
        headers: JSON_HEADERS,
        body: { operation: name, violations: requestViolations },
      };
    }

    const response = contract.respond(operation, request);
    const responseViolations = contract.validateResponse(operation, response);
    calls.push({
      request: description,
      operation: name,
      matched,
      status: response.statusCode,
      requestViolations,
      responseViolations,
    });
    return response;
  };

  const mockFetch: typeof fetch = async (input, init) =>
    toResponse(await handle(await toContractRequest(new Request(input, init))));

  return { fetch: mockFetch, calls, rejectedResponses: engine.rejected };
};
