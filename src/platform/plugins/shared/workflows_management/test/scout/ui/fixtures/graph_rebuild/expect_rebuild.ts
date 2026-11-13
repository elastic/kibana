/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { RebuildResult } from './rebuild_workflow';

/** A problem the graph builder is known to have with a fixture. `key` is `<where> | <what> | <kind>`. */
export interface KnownGap {
  readonly key: string;
  /** Why the builder cannot do this yet; a gap without a reason is not accepted. */
  readonly reason: string;
}

export const gapKey = (where: string, what: string, kind: string): string =>
  `${where} | ${what} | ${kind}`;

/** Every problem of a rebuild as a key: a difference after read-back, a value with no control, or an issue met while building. */
export const problemKeys = ({ diffs, unsupported, issues }: RebuildResult): string[] => [
  ...diffs.map(({ where, what, kind }) => gapKey(where, what, kind)),
  ...unsupported.map(({ where, what }) => gapKey(where, what, 'unsupported')),
  ...issues.map(({ where, what }) => gapKey(where, what, 'issue')),
];

/**
 * Fails when the rebuild has a problem that is not a known gap, and when a known gap did not occur: a gap that
 * was fixed has to be removed from the list, so the list never hides a new regression behind an old entry.
 */
export const expectRebuildMatches = (
  result: RebuildResult,
  knownGaps: readonly KnownGap[]
): void => {
  const found = new Set(problemKeys(result));
  const allowed = new Set(knownGaps.map(({ key }) => key));
  expect({
    unexpected: [...found].filter((key) => !allowed.has(key)),
    staleKnownGaps: [...allowed].filter((key) => !found.has(key)),
  }).toStrictEqual({ unexpected: [], staleKnownGaps: [] });
};
