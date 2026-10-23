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
  ResponderContext,
  Violation,
} from '../contract/types';
import type {
  OperationRef,
  Recording,
  RejectedResponse,
  ResponseFixture,
  ResponseOrigin,
} from '../engine/response_engine';
import type { NamedResponse } from '../engine/named_responses';
import { collectNamedResponses, rejectUnknownNamedResponses } from '../engine/named_responses';
import { createResponseEngine } from '../engine/response_engine';
import type { PaginationOptions } from '../engine/paginate';
import { withPagination } from '../engine/paginate';
import { sampleBoundaryResponse, sampleResponse } from '../engine/sample_response';
import type { GraphQLSpec } from '../graphql/graphql_protocol';
import { createGraphQLProtocol, isGraphQLSpec, toEndpoint } from '../graphql/graphql_protocol';
import type { McpSpec } from '../mcp/mcp_protocol';
import { createMcpProtocol, isMcpSpec } from '../mcp/mcp_protocol';
import type { ContractOperation, OpenApiDocument } from '../openapi';
import { loadContractOperations } from '../openapi';
import { createOpenApiAdapter } from '../openapi/openapi_adapter';
import { findTokenEndpoints, respondToTokenRequest } from '../openapi/token_endpoints';
import type { OperationDescription } from './describe_operation';
import { describeOperation } from './describe_operation';
import type { EmulatorOperation, LoadedProtocol } from './list_operations';
import { listOperations } from './list_operations';

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
  /**
   * Set for protocol messages that call no vendor operation, such as MCP's `initialize`;
   * `operation` names the message.
   */
  readonly protocolMessage?: true;
  /** Set for requests to the token URL of an OAuth 2 flow, which the mock answers itself. */
  readonly token?: true;
  /**
   * Set for answered OpenAPI operations: whether the response came from a fixture set while the
   * emulator runs (`runtime-fixture`), a fixture, a recording, the spec's examples and samples
   * (`generated`), or a `respond` that answered without deferring to the default chain
   * (`responder`).
   */
  readonly responseSource?: ResponseOrigin | 'generated' | 'responder';
  readonly status: number;
  readonly requestViolations: readonly Violation[];
  readonly responseViolations: readonly Violation[];
}

/** An OpenAPI document, or a spec of a protocol with its own endpoints: GraphQL or MCP. */
export type EmulatorSpec = OpenApiDocument | GraphQLSpec | McpSpec;

export interface EmulatorOptions extends PaginationOptions {
  /**
   * The vendor specs the connector targets, e.g. both API versions it calls. Named specs (such
   * as `{ v1, v2 }`) let `calls`, fixtures, recordings and pagination tell their operations apart.
   */
  readonly specs: readonly EmulatorSpec[] | Readonly<Record<string, EmulatorSpec>>;
  /**
   * Hand-written responses, served in preference to everything else. They name an OpenAPI
   * operation by method and path template, and a GraphQL or MCP one by name.
   */
  readonly fixtures?: readonly ResponseFixture[];
  /** Responses captured from the vendor, served when they still conform to the spec. */
  readonly recordings?: readonly Recording[];
  /**
   * Answers OpenAPI operations in front of the default chain: fixtures, recordings, then
   * examples or samples. `context.next()` gives the default chain's answer, and `context.state`
   * keeps what the responder needs across requests, e.g. to read back what it created. Answers
   * may be promises, and are validated like any other.
   */
  readonly respond?: Responder;
  /** Called with each call as it is recorded, e.g. to log requests as they arrive. */
  readonly onCall?: (call: ContractCall) => void;
  /**
   * How the default chain samples responses the spec has no example for: `typical` values, or
   * values at the schema's upper bounds (`boundary`), which also skips examples.
   */
  readonly sampling?: 'typical' | 'boundary';
}

export interface Emulator {
  readonly fetch: typeof fetch;
  readonly calls: ContractCall[];
  /** The operations the specs declare, which is what the emulator answers. */
  readonly operations: readonly EmulatorOperation[];
  /** Fixtures and recordings that aren't served because the spec contradicts them. */
  readonly rejectedResponses: readonly RejectedResponse[];
  /**
   * Fixtures set while the emulator runs, e.g. for a test or an agent to pick a scenario. They
   * take precedence over `fixtures`, are checked against the spec when set (an undeclared error
   * status, such as a 429, is allowed), and are dropped by `reset()`.
   */
  readonly runtimeFixtures: {
    /** Replaces the runtime fixtures of the operations they name; sets none if one is rejected. */
    readonly set: (fixtures: readonly ResponseFixture[]) => readonly RejectedResponse[];
    readonly list: () => readonly ResponseFixture[];
    /** Drops the runtime fixtures of the OpenAPI operation with this `id`, or all of them. */
    readonly clear: (id?: string, source?: string) => void;
  };
  /** Describes an OpenAPI operation by its `id`, as `operations` lists it, to write a fixture. */
  readonly describeOperation: (id: string, source?: string) => OperationDescription | undefined;
  /**
   * Empties `calls`, the responder state and the runtime fixtures, e.g. between tests; `calls`
   * keeps its identity.
   */
  readonly reset: () => void;
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

const isSpecList = (specs: EmulatorOptions['specs']): specs is readonly EmulatorSpec[] =>
  Array.isArray(specs);

const toNamedSpecs = (
  specs: EmulatorOptions['specs']
): Array<readonly [string | undefined, EmulatorSpec]> =>
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

const loadSpecs = (specs: EmulatorOptions['specs']): ContractOperation[] =>
  toNamedSpecs(specs).flatMap(([source, spec]) =>
    isGraphQLSpec(spec) || isMcpSpec(spec) ? [] : loadSpec(spec, source)
  );

const loadProtocols = (
  specs: EmulatorOptions['specs'],
  responses: readonly NamedResponse[]
): LoadedProtocol[] =>
  toNamedSpecs(specs).flatMap(([source, spec]): LoadedProtocol[] => {
    const options = { source, responses };
    return isGraphQLSpec(spec)
      ? [{ source, protocol: 'graphql', instance: createGraphQLProtocol(spec, options) }]
      : isMcpSpec(spec)
      ? [{ source, protocol: 'mcp', instance: createMcpProtocol(spec, options) }]
      : [];
  });

const toProtocolEndpoints = (loaded: readonly LoadedProtocol[]): Map<string, ContractProtocol> =>
  new Map(
    loaded.flatMap(({ instance }) =>
      instance.endpoints.map((endpoint) => [endpoint, instance] as const)
    )
  );

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
 * token URLs of the specs' OAuth 2 flows issue stub tokens, and GraphQL and MCP specs answer at
 * their endpoints. Axios clients can use it with `{ adapter: 'fetch', env: { fetch } }`.
 */
export const createEmulatorFetch = ({
  specs,
  fixtures,
  recordings,
  pagination,
  collectionSize,
  respond,
  sampling = 'typical',
  onCall,
}: EmulatorOptions): Emulator => {
  const operations = loadSpecs(specs);
  const namedResponses = collectNamedResponses(fixtures, recordings);
  const loadedProtocols = loadProtocols(specs, namedResponses);
  const protocols = toProtocolEndpoints(loadedProtocols);
  const tokenEndpoints = findTokenEndpoints(operations);
  const engine = createResponseEngine(operations, {
    fixtures,
    recordings,
    fallback: sampling === 'boundary' ? sampleBoundaryResponse : sampleResponse,
  });
  // Paging applies to the default chain, so a responder that defers to `next()` pages too.
  const defaultChain = withPagination(
    operations,
    { pagination, collectionSize, recordedExchanges: engine.recordedExchanges },
    engine.respond
  );
  const contract = createOpenApiAdapter(operations, respond ?? defaultChain);
  const state = new Map<unknown, unknown>();
  // The contexts whose responder deferred to the default chain, for `responseSource`.
  const deferred = new WeakSet<ResponderContext>();
  const contextFor = (operation: ContractOperation, request: ContractRequest) => {
    const context: ResponderContext = {
      state,
      next: async () => {
        deferred.add(context);
        return defaultChain(operation, request, context);
      },
    };
    return context;
  };
  const calls: ContractCall[] = [];
  const record = (call: ContractCall) => {
    calls.push(call);
    onCall?.(call);
  };

  const handle = async (request: ContractRequest): Promise<ContractResponse> => {
    const description = `${request.method.toUpperCase()} ${request.url.origin}${
      request.url.pathname
    }`;
    const protocol = protocols.get(toEndpoint(request.url));
    if (protocol) {
      const {
        response,
        operations: called,
        messages = [],
        requestViolations,
        responseViolations = [],
      } = await protocol.handle(request);
      const base = {
        request: description,
        status: response.statusCode,
        requestViolations,
        responseViolations,
      };
      if (called.length === 0 && messages.length === 0) {
        record(base);
      }
      for (const message of messages) {
        record({ ...base, operation: message, protocolMessage: true });
      }
      for (const { name, source, readOnly } of called) {
        const matched = { name, ...(source === undefined ? {} : { source }) };
        record({ ...base, operation: name, matched, readOnly });
      }
      return response;
    }
    const routed = contract.route(request);
    const grants = 'operation' in routed ? undefined : tokenEndpoints(request.url);
    if (grants) {
      const { response, violations } = respondToTokenRequest(grants, request);
      record({
        request: description,
        operation: 'OAuth token',
        token: true,
        status: response.statusCode,
        requestViolations: violations,
        responseViolations: [],
      });
      return response;
    }
    if (!('operation' in routed)) {
      record({
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
      record({
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

    const routedRequest = { ...request, pathParameters: routed.pathParameters };
    const context = contextFor(operation, routedRequest);
    const response = await contract.respond(operation, routedRequest, context);
    const responseViolations = contract.validateResponse(operation, response);
    record({
      request: description,
      operation: name,
      matched,
      responseSource:
        respond && !deferred.has(context)
          ? 'responder'
          : engine.servedFrom(operation, routedRequest) ?? 'generated',
      status: response.statusCode,
      requestViolations,
      responseViolations,
    });
    return response;
  };

  const findById = (id: string, source?: string) =>
    operations.filter(
      (operation) =>
        operation.id === id && (source === undefined || operation.spec.source === source)
    );

  const mockFetch: typeof fetch = async (input, init) =>
    toResponse(await handle(await toContractRequest(new Request(input, init))));

  const rejectedResponses = [
    ...engine.rejected,
    ...loadedProtocols.flatMap(({ instance }) => instance.rejectedResponses),
    ...rejectUnknownNamedResponses(
      namedResponses,
      loadedProtocols.map(({ source, instance }) => ({ source, operations: instance.answerable }))
    ),
  ];
  return {
    fetch: mockFetch,
    calls,
    operations: listOperations(operations, loadedProtocols),
    rejectedResponses,
    runtimeFixtures: {
      set: engine.runtime.set,
      list: engine.runtime.list,
      clear: (id, source) =>
        engine.runtime.clear(id === undefined ? undefined : findById(id, source)),
    },
    describeOperation: (id, source) => {
      const [operation] = findById(id, source);
      return operation && describeOperation(operation);
    },
    reset: () => {
      calls.length = 0;
      state.clear();
      engine.runtime.clear();
    },
  };
};
