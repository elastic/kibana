/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ContractRequest,
  ContractResponse,
  NamedOperationRef,
  Responder,
  Violation,
} from '../contract/types';
import type { ContractOperation } from '../openapi/types';
import { validateResponse } from '../openapi/validate_response';
import type { RequestMatcher } from './request_match';
import { countConditions, matchesRequest } from './request_match';

/**
 * Identifies an operation by method and path template, e.g. `GET /repos/{owner}/{repo}`. With
 * named specs, `source` restricts it to one of them; without, it names the operation in every spec.
 */
export interface OperationRef {
  readonly method: string;
  readonly path: string;
  readonly source?: string;
}

export interface StoredResponse {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

/**
 * A hand-written response for an operation. Operations of protocols such as GraphQL and MCP are
 * named, e.g. `{ name: 'query boards' }`.
 */
export interface ResponseFixture {
  readonly operation: OperationRef | NamedOperationRef;
  /**
   * For emulators combined by `combineEmulators`, the connector whose emulator the fixture is
   * for; other emulators ignore it.
   */
  readonly connector?: string;
  /**
   * For OpenAPI operations, the requests the fixture answers, e.g. `{ path: { id: '42' } }`;
   * without it, every request the operation's other fixtures don't match.
   */
  readonly when?: RequestMatcher;
  readonly response: StoredResponse;
}

/** A request/response pair captured from the real vendor API. */
export interface RecordedExchange {
  readonly operation: OperationRef | NamedOperationRef;
  readonly request?: {
    /** The decoded path parameters, which recordings of one operation differ by. */
    readonly pathParameters?: Readonly<Record<string, string>>;
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
  /** `METHOD /path`, or the operation's name, as the fixture or recording names it. */
  readonly operation: string;
  /** With named specs, the spec that contradicts it. */
  readonly spec?: string;
  readonly violations: readonly Violation[];
  /** Set by `combineEmulators`: the connector whose fixture or recording it is. */
  readonly connector?: string;
}

export interface ResponseEngineOptions {
  readonly fixtures?: readonly ResponseFixture[];
  readonly recordings?: readonly Recording[];
  /** Answers operations without a fixture or a conforming recording. */
  readonly fallback: Responder;
}

/** Where an answer came from, when not from the fallback. */
export type ResponseOrigin = RejectedResponse['source'] | 'runtime-fixture';

/** Fixtures set while the mock runs, which take precedence over the ones it was created with. */
export interface RuntimeFixtures {
  /**
   * Sets the fixtures for the operations they name, replacing the runtime fixtures those
   * operations had. Returns the fixtures it rejects, and then sets none of them.
   */
  readonly set: (fixtures: readonly ResponseFixture[]) => readonly RejectedResponse[];
  /** The runtime fixtures in effect, in the order they were set. */
  readonly list: () => readonly ResponseFixture[];
  /** Drops the runtime fixtures of the given operations, or all of them. */
  readonly clear: (operations?: readonly ContractOperation[]) => void;
}

export interface ResponseEngine {
  readonly respond: Responder;
  /** Where a request's answer comes from; undefined for the fallback. */
  readonly servedFrom: (
    operation: ContractOperation,
    request: ContractRequest
  ) => ResponseOrigin | undefined;
  readonly runtime: RuntimeFixtures;
  readonly rejected: readonly RejectedResponse[];
  /**
   * The recorded success exchanges that conform to the spec, in recording order; none for
   * operations with a fixture, which overrides them.
   */
  readonly recordedExchanges: (operation: ContractOperation) => readonly RecordedExchange[];
}

export const isNamedOperationRef = (
  ref: OperationRef | NamedOperationRef
): ref is NamedOperationRef => 'name' in ref;

export const isSuccessStatus = (status: number): boolean => status >= 200 && status < 300;

/** Formats an operation reference as `METHOD /path`, the key fixtures and recordings match on. */
export const toOperationKey = ({ method, path }: OperationRef): string =>
  `${method.toUpperCase()} ${path}`;

/** Returns a lookup of the operations an `OperationRef` names. */
export const createOperationIndex = (
  operations: readonly ContractOperation[]
): ((ref: OperationRef) => readonly ContractOperation[]) => {
  const byKey = new Map<string, ContractOperation[]>();
  for (const operation of operations) {
    const key = toOperationKey(operation);
    byKey.set(key, [...(byKey.get(key) ?? []), operation]);
  }
  return (ref) =>
    (byKey.get(toOperationKey(ref)) ?? []).filter(
      ({ spec }) => ref.source === undefined || spec.source === ref.source
    );
};

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

export const NOT_IN_SPEC: Violation = {
  path: [],
  code: 'operation',
  message: 'The spec has no such operation',
};

interface Candidate {
  readonly origin: ResponseOrigin;
  readonly when?: RequestMatcher;
  readonly conditions: number;
  readonly response: ContractResponse;
}

// A recording applies to the request it recorded, except for its headers, which carry
// credentials and client details rather than what the vendor answered.
const toRecordedMatcher = ({ request }: RecordedExchange): RequestMatcher | undefined => {
  const { pathParameters, query, body } = request ?? {};
  const matcher: RequestMatcher = {
    ...(pathParameters && Object.keys(pathParameters).length > 0 ? { path: pathParameters } : {}),
    ...(query && Object.keys(query).length > 0 ? { query } : {}),
    ...(body === undefined ? {} : { body }),
  };
  return Object.keys(matcher).length > 0 ? matcher : undefined;
};

const unknownPathParameters = (operation: ContractOperation, when?: RequestMatcher): Violation[] =>
  Object.keys(when?.path ?? {})
    .filter((name) => !operation.parameters.some((p) => p.in === 'path' && p.name === name))
    .map((name) => ({
      path: ['when', 'path', name],
      code: 'when',
      message: `The operation has no path parameter ${name}`,
    }));

// The most specific entry whose matcher the request meets, in order among equals.
const bestMatch = (entries: readonly Candidate[], request: ContractRequest) =>
  entries
    .filter(({ when }) => when !== undefined && matchesRequest(when, request))
    .reduce<Candidate | undefined>(
      (best, entry) => (best === undefined || entry.conditions > best.conditions ? entry : best),
      undefined
    );

const toCandidate = (
  origin: ResponseOrigin,
  when: RequestMatcher | undefined,
  response: ContractResponse
): Candidate => ({
  origin,
  ...(when === undefined ? {} : { when }),
  conditions: when === undefined ? 0 : countConditions(when),
  response,
});

// Vendors often leave error statuses such as 429 out of their specs, and still answer with them.
const isUndeclaredError = ({ code }: Violation, { status }: StoredResponse) =>
  code === 'status' && status >= 400;

/**
 * Answers each request with, in order of preference: the runtime fixtures (see
 * `RuntimeFixtures`), chosen like fixtures; the most specific fixture whose `when` it
 * matches, else a fixture without `when`; the most specific recording of the same request, else
 * the operation's first recording; or the fallback. Recordings that no longer conform to the spec
 * are drift on the vendor's side, so they are listed in `rejected` instead of being served.
 */
export const createResponseEngine = (
  operations: readonly ContractOperation[],
  { fixtures = [], recordings = [], fallback }: ResponseEngineOptions
): ResponseEngine => {
  const findOperations = createOperationIndex(operations);
  const candidates = new Map<ContractOperation, Candidate[]>();
  const recorded = new Map<ContractOperation, RecordedExchange[]>();
  const withFixture = new Set<ContractOperation>();
  const rejected: RejectedResponse[] = [];

  const add = (origin: RejectedResponse['source'], entry: ResponseFixture | RecordedExchange) => {
    const { operation: ref, response } = entry;
    // Protocols such as GraphQL serve their named operations themselves.
    if (isNamedOperationRef(ref)) {
      return;
    }
    const key = toOperationKey(ref);
    const matched = findOperations(ref);
    if (matched.length === 0) {
      rejected.push({
        source: origin,
        operation: key,
        ...(ref.source === undefined ? {} : { spec: ref.source }),
        violations: [NOT_IN_SPEC],
      });
      return;
    }
    const contractResponse = toContractResponse(response);
    const when = origin === 'fixture' ? (entry as ResponseFixture).when : toRecordedMatcher(entry);
    for (const operation of matched) {
      // Fixtures are deliberate overrides; their violations show up in `calls` when served.
      const violations =
        origin === 'recording'
          ? validateResponse(operation, contractResponse)
          : unknownPathParameters(operation, when);
      if (violations.length > 0) {
        const { source } = operation.spec;
        rejected.push({
          source: origin,
          operation: key,
          ...(source === undefined ? {} : { spec: source }),
          violations,
        });
      } else {
        // A fixture for every request overrides the recordings, which paging uses too.
        if (origin === 'fixture' && when === undefined) {
          withFixture.add(operation);
        } else if (origin === 'recording' && !withFixture.has(operation)) {
          recorded.set(operation, [...(recorded.get(operation) ?? []), entry]);
        }
        const candidate = toCandidate(origin, when, contractResponse);
        candidates.set(operation, [...(candidates.get(operation) ?? []), candidate]);
      }
    }
  };

  fixtures.forEach((fixture) => add('fixture', fixture));
  // Error responses are kept in recordings for tests that ask for them, not served by default.
  recordings
    .flatMap(({ exchanges }) => exchanges)
    .filter(({ response: { status } }) => isSuccessStatus(status))
    .forEach((exchange) => add('recording', exchange));

  // Each operation's runtime fixtures, with their candidates.
  const runtime = new Map<
    ContractOperation,
    { readonly fixtures: readonly ResponseFixture[]; readonly candidates: readonly Candidate[] }
  >();

  // Runtime fixtures must conform to the spec, but may answer with an undeclared error status.
  const checkRuntimeFixture = (fixture: ResponseFixture) => {
    const { operation: ref, response, when } = fixture;
    if (isNamedOperationRef(ref)) {
      const violation: Violation = {
        path: ['operation'],
        code: 'operation',
        message: 'Runtime fixtures answer OpenAPI operations; name one by method and path',
      };
      return {
        matched: [],
        rejected: [{ source: 'fixture' as const, operation: ref.name, violations: [violation] }],
      };
    }
    const key = toOperationKey(ref);
    const matched = findOperations(ref);
    if (matched.length === 0) {
      const notFound: RejectedResponse = {
        source: 'fixture',
        operation: key,
        ...(ref.source === undefined ? {} : { spec: ref.source }),
        violations: [NOT_IN_SPEC],
      };
      return { matched, rejected: [notFound] };
    }
    const contractResponse = toContractResponse(response);
    const rejectedHere = matched.flatMap((operation): RejectedResponse[] => {
      const violations = [
        ...unknownPathParameters(operation, when),
        ...validateResponse(operation, contractResponse).filter(
          (violation) => !isUndeclaredError(violation, response)
        ),
      ];
      const { source } = operation.spec;
      return violations.length === 0
        ? []
        : [
            {
              source: 'fixture',
              operation: key,
              ...(source === undefined ? {} : { spec: source }),
              violations,
            },
          ];
    });
    return { matched, rejected: rejectedHere };
  };

  const runtimeFixtures: RuntimeFixtures = {
    set: (entries) => {
      const checked = entries.map((fixture) => ({ fixture, ...checkRuntimeFixture(fixture) }));
      const rejectedFixtures = checked.flatMap(({ rejected: found }) => found);
      if (rejectedFixtures.length > 0) {
        return rejectedFixtures;
      }
      const byOperation = new Map<ContractOperation, ResponseFixture[]>();
      for (const { fixture, matched } of checked) {
        for (const operation of matched) {
          byOperation.set(operation, [...(byOperation.get(operation) ?? []), fixture]);
        }
      }
      for (const [operation, operationFixtures] of byOperation) {
        runtime.set(operation, {
          fixtures: operationFixtures,
          candidates: operationFixtures.map(({ when, response }) =>
            toCandidate('runtime-fixture', when, toContractResponse(response))
          ),
        });
      }
      return [];
    },
    list: () => [...new Set([...runtime.values()].flatMap((entry) => entry.fixtures))],
    clear: (cleared) => {
      if (cleared === undefined) {
        runtime.clear();
      } else {
        cleared.forEach((operation) => runtime.delete(operation));
      }
    },
  };

  const select = (operation: ContractOperation, request: ContractRequest) => {
    const set = runtime.get(operation)?.candidates ?? [];
    const entries = candidates.get(operation) ?? [];
    const overrides = entries.filter(({ origin }) => origin === 'fixture');
    const replays = entries.filter(({ origin }) => origin === 'recording');
    return (
      bestMatch(set, request) ??
      set.find(({ when }) => when === undefined) ??
      bestMatch(overrides, request) ??
      overrides.find(({ when }) => when === undefined) ??
      bestMatch(replays, request) ??
      replays[0]
    );
  };

  return {
    respond: (operation, request, context) =>
      select(operation, request)?.response ?? fallback(operation, request, context),
    servedFrom: (operation, request) => select(operation, request)?.origin,
    runtime: runtimeFixtures,
    rejected,
    recordedExchanges: (operation) => recorded.get(operation) ?? [],
  };
};
