/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractResponse, Responder, Violation } from '../contract/types';
import type { ContractOperation } from '../openapi/types';
import { validateResponse } from '../openapi/validate_response';

/** Identifies an operation by method and path template, e.g. `GET /repos/{owner}/{repo}`. */
export interface OperationRef {
  readonly method: string;
  readonly path: string;
}

export interface StoredResponse {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

/** A hand-written response for an operation, served whenever the operation is called. */
export interface ResponseFixture {
  readonly operation: OperationRef;
  readonly response: StoredResponse;
}

/** A request/response pair captured from the real vendor API. */
export interface RecordedExchange {
  readonly operation: OperationRef;
  readonly request?: {
    readonly query?: Readonly<Record<string, string | string[]>>;
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: unknown;
  };
  readonly response: StoredResponse;
}

export interface Recording {
  readonly recordedAt?: string;
  readonly exchanges: readonly RecordedExchange[];
}

/** A fixture or recording the mock doesn't serve, because the spec contradicts it. */
export interface RejectedResponse {
  readonly source: 'fixture' | 'recording';
  /** `METHOD /path` as the fixture or recording names it. */
  readonly operation: string;
  readonly violations: readonly Violation[];
}

export interface ResponseEngineOptions {
  readonly fixtures?: readonly ResponseFixture[];
  readonly recordings?: readonly Recording[];
  /** Answers operations without a fixture or a conforming recording. */
  readonly fallback: Responder;
}

export interface ResponseEngine {
  readonly respond: Responder;
  readonly rejected: readonly RejectedResponse[];
  /**
   * The recorded success exchanges that conform to the spec, in recording order; none for
   * operations with a fixture, which overrides them.
   */
  readonly recordedExchanges: (operation: ContractOperation) => readonly RecordedExchange[];
}

/** Formats an operation reference as `METHOD /path`, the key fixtures and recordings match on. */
export const toOperationKey = ({ method, path }: OperationRef): string =>
  `${method.toUpperCase()} ${path}`;

const toContractResponse = ({ status, headers = {}, body }: StoredResponse): ContractResponse => {
  const hasContentType = Object.keys(headers).some((name) => name.toLowerCase() === 'content-type');
  // Stored bodies that aren't text are JSON, which is how the mock serializes them.
  return {
    statusCode: status,
    headers:
      hasContentType || body === undefined || typeof body === 'string'
        ? headers
        : { ...headers, 'content-type': 'application/json' },
    body,
  };
};

const NOT_IN_SPEC: Violation = {
  path: [],
  code: 'operation',
  message: 'The spec has no such operation',
};

/**
 * Answers each operation with, in order of preference: its fixture, its first recorded success
 * response that still conforms to the spec, or the fallback. Recordings that no longer conform
 * are drift on the vendor's side, so they are listed in `rejected` instead of being served.
 */
export const createResponseEngine = (
  operations: readonly ContractOperation[],
  { fixtures = [], recordings = [], fallback }: ResponseEngineOptions
): ResponseEngine => {
  const byKey = new Map(operations.map((operation) => [toOperationKey(operation), operation]));
  const served = new Map<ContractOperation, ContractResponse>();
  const recorded = new Map<ContractOperation, RecordedExchange[]>();
  const withFixture = new Set<ContractOperation>();
  const rejected: RejectedResponse[] = [];

  const add = (source: RejectedResponse['source'], entry: ResponseFixture | RecordedExchange) => {
    const { operation: ref, response } = entry;
    const key = toOperationKey(ref);
    const operation = byKey.get(key);
    if (!operation) {
      rejected.push({ source, operation: key, violations: [NOT_IN_SPEC] });
      return;
    }
    const contractResponse = toContractResponse(response);
    // Fixtures are deliberate overrides; their violations show up in `calls` when served.
    const violations = source === 'recording' ? validateResponse(operation, contractResponse) : [];
    if (violations.length > 0) {
      rejected.push({ source, operation: key, violations });
      return;
    }
    if (source === 'fixture') {
      withFixture.add(operation);
    } else if (!withFixture.has(operation)) {
      recorded.set(operation, [...(recorded.get(operation) ?? []), entry]);
    }
    if (!served.has(operation)) {
      served.set(operation, contractResponse);
    }
  };

  fixtures.forEach((fixture) => add('fixture', fixture));
  // Error responses are kept in recordings for tests that ask for them, not served by default.
  recordings
    .flatMap(({ exchanges }) => exchanges)
    .filter(({ response: { status } }) => status >= 200 && status < 300)
    .forEach((exchange) => add('recording', exchange));

  return {
    respond: (operation, request) => served.get(operation) ?? fallback(operation, request),
    rejected,
    recordedExchanges: (operation) => recorded.get(operation) ?? [],
  };
};
