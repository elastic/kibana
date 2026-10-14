/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractRequest, ContractResponse, Responder, Violation } from '../contract/types';
import { sampleResponse } from '../engine/sample_response';
import type { OpenApiDocument } from '../openapi';
import { loadContractOperations } from '../openapi';
import { createOpenApiAdapter } from '../openapi/openapi_adapter';

/** One request the mock received, for assertions in tests. */
export interface ContractCall {
  /** `METHOD url` as the connector sent it, without the query string. */
  readonly request: string;
  /** The matched operation's `operationId`, or `METHOD /path` when it has none. */
  readonly operation?: string;
  readonly status: number;
  readonly requestViolations: readonly Violation[];
  readonly responseViolations: readonly Violation[];
}

export interface ContractMockOptions {
  /** The vendor specs the connector targets, e.g. both API versions it calls. */
  readonly specs: readonly OpenApiDocument[];
  /** Produces responses to valid requests; defaults to deterministic samples of the spec. */
  readonly respond?: Responder;
}

export interface ContractMock {
  readonly fetch: typeof fetch;
  readonly calls: ContractCall[];
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

const toResponse = ({ statusCode, headers, body }: ContractResponse): Response => {
  const payload =
    body === undefined || body === null
      ? null
      : typeof body === 'string'
      ? body
      : JSON.stringify(body);
  return new Response(payload, { status: statusCode, headers: { ...headers } });
};

/**
 * Creates a `fetch` that answers requests in-process from a vendor spec. Unmatched requests
 * get 404 and requests that break the spec get 422 listing the violations; every request is
 * recorded in `calls`. Axios clients can use it with `{ adapter: 'fetch', env: { fetch } }`.
 */
export const createContractMockFetch = ({
  specs,
  respond = sampleResponse,
}: ContractMockOptions): ContractMock => {
  const contract = createOpenApiAdapter(specs.flatMap(loadContractOperations), respond);
  const calls: ContractCall[] = [];

  const handle = async (request: ContractRequest): Promise<ContractResponse> => {
    const description = `${request.method.toUpperCase()} ${request.url.origin}${
      request.url.pathname
    }`;
    const routed = contract.route(request);
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
    const requestViolations = contract.validateRequest(routed, request);
    if (requestViolations.length > 0) {
      calls.push({
        request: description,
        operation: name,
        status: 422,
        requestViolations,
        responseViolations: [],
      });
      return {
        statusCode: 422,
        headers: JSON_HEADERS,
        body: { operation: name, violations: requestViolations },
      };
    }

    const response = contract.respond(operation, request);
    const responseViolations = contract.validateResponse(operation, response);
    calls.push({
      request: description,
      operation: name,
      status: response.statusCode,
      requestViolations,
      responseViolations,
    });
    return response;
  };

  const mockFetch: typeof fetch = async (input, init) =>
    toResponse(await handle(await toContractRequest(new Request(input, init))));

  return { fetch: mockFetch, calls };
};
