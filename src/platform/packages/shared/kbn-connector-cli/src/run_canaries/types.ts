/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const EXPECTED_TYPES = ['string', 'number', 'boolean', 'object', 'array', 'null'] as const;

export type ExpectedType = (typeof EXPECTED_TYPES)[number];

/** A value that must be present in the response `data`, addressed by a dot-separated path. */
export interface FixtureExpectation {
  /** Path into the response `data`, e.g. `login` or `items.0.name`, or `$` for the response itself. Array indices are plain non-negative integer segments. */
  path: string;
  type: ExpectedType;
}

/** One action execution with known-good input and the response shape it should produce. */
export interface FixtureCase {
  action: string;
  /** Optional label to tell apart several cases for the same action. */
  name?: string;
  /** Set to false to skip the case without deleting it. Defaults to true. */
  enabled?: boolean;
  input: Record<string, unknown>;
  expect: FixtureExpectation[];
}

/** Raw YAML fixture file. Pairs with the manifest that has the same `spec_id`. */
export interface FixtureFile {
  spec_id: string;
  cases: FixtureCase[];
}

/**
 * - `ok`: executed and the response matched.
 * - `auth`: credentials rejected.
 * - `test`: executed, but the response no longer matches the fixture (the drift signal).
 * - `error`: the vendor rejected or failed the call (drift or an outage).
 * - `misc`: transient or unclassifiable (timeouts, network, rate limits, connector setup or runner failures).
 * - `fixture`: the fixture itself is invalid for the current spec, or Kibana rejected its params; not vendor drift.
 */
export type CanaryOutcome = 'ok' | 'auth' | 'test' | 'error' | 'misc' | 'fixture';

export interface Classification {
  outcome: CanaryOutcome;
  reason?: string;
}

export interface CanaryResult extends Classification {
  specId: string;
  action: string;
  label: string;
}
