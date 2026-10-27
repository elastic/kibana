/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NamedOperationRef, Violation } from '../contract/types';
import type {
  Recording,
  RejectedResponse,
  ResponseFixture,
  StoredResponse,
} from './response_engine';
import { isNamedOperationRef, isSuccessStatus, NOT_IN_SPEC } from './response_engine';

/** A fixture or recorded response for an operation of a protocol, such as `query boards`. */
export interface NamedResponse {
  readonly origin: RejectedResponse['source'];
  readonly operation: NamedOperationRef;
  readonly response: StoredResponse;
}

export interface NamedResponseSelection {
  /** The response each operation is answered with, by operation name. */
  readonly served: ReadonlyMap<string, NamedResponse>;
  readonly rejected: readonly RejectedResponse[];
}

const appliesTo = ({ source }: NamedOperationRef, specSource: string | undefined): boolean =>
  source === undefined || source === specSource;

/** The fixtures, then the recorded success responses, that name a protocol operation. */
export const collectNamedResponses = (
  fixtures: readonly ResponseFixture[] = [],
  recordings: readonly Recording[] = []
): NamedResponse[] => [
  ...fixtures.flatMap(({ operation, response }) =>
    isNamedOperationRef(operation) ? [{ origin: 'fixture' as const, operation, response }] : []
  ),
  // Error responses are kept in recordings for tests that ask for them, not served by default.
  ...recordings
    .flatMap(({ exchanges }) => exchanges)
    .flatMap(({ operation, response }) =>
      isNamedOperationRef(operation) && isSuccessStatus(response.status)
        ? [{ origin: 'recording' as const, operation, response }]
        : []
    ),
];

/**
 * Picks the response a protocol's spec answers each of its operations with: the fixture, else
 * the first recording `check` finds no violations in. Recordings that break the spec are
 * returned in `rejected`; responses for other specs or for operations the spec lacks are skipped,
 * and so are recordings `isError` finds a protocol error in, as recorded HTTP errors are.
 */
export const selectNamedResponses = (
  responses: readonly NamedResponse[],
  {
    source,
    operations,
    check,
    isError,
  }: {
    readonly source?: string;
    readonly operations: ReadonlySet<string>;
    readonly check: (name: string, response: StoredResponse) => Violation[];
    /** Whether a response reports a failure though its HTTP status is a success. */
    readonly isError: (response: StoredResponse) => boolean;
  }
): NamedResponseSelection => {
  const served = new Map<string, NamedResponse>();
  const rejected: RejectedResponse[] = [];
  for (const entry of responses) {
    const { origin, operation, response } = entry;
    if (!appliesTo(operation, source) || !operations.has(operation.name)) {
      continue;
    }
    if (origin === 'recording' && isError(response)) {
      continue;
    }
    // Fixtures are deliberate overrides; their violations show up in `calls` when served.
    const violations = origin === 'recording' ? check(operation.name, response) : [];
    if (violations.length > 0) {
      rejected.push({
        source: origin,
        operation: operation.name,
        ...(source === undefined ? {} : { spec: source }),
        violations,
      });
    } else if (!served.has(operation.name)) {
      served.set(operation.name, entry);
    }
  }
  return { served, rejected };
};

/** Rejects the responses that name an operation no protocol spec they apply to declares. */
export const rejectUnknownNamedResponses = (
  responses: readonly NamedResponse[],
  specs: ReadonlyArray<{ readonly source?: string; readonly operations: ReadonlySet<string> }>
): RejectedResponse[] =>
  responses
    .filter(
      ({ operation }) =>
        !specs.some(
          ({ source, operations }) => appliesTo(operation, source) && operations.has(operation.name)
        )
    )
    .map(({ origin, operation }) => ({
      source: origin,
      operation: operation.name,
      ...(operation.source === undefined ? {} : { spec: operation.source }),
      violations: [NOT_IN_SPEC],
    }));
