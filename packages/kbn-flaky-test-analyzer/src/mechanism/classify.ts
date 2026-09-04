/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mechanism } from '../report/schema';

// Built via the constructor so the ESC byte is not a literal control character in a regex.
const ANSI_COLOR = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/**
 * Ordered rules — the first match wins, so ordering is behaviour, not style.
 *
 * `infra` is deliberately first. A dependency returning a 500 inside a `beforeAll` matches both
 * the infra and the hook rule, and classifying it as a hook problem would route a broken service
 * to the test fixer. Mechanism gates fix eligibility, so the mechanism that describes the *cause*
 * has to win over the one that describes where it surfaced.
 */
const RULES: ReadonlyArray<{ mechanism: Mechanism; pattern: RegExp }> = [
  { mechanism: 'infra', pattern: /KbnClientRequesterError|ResponseError|ConnectionError/ },
  { mechanism: 'hook-setup', pattern: /"(before|after)(All|Each)" hook/i },
  { mechanism: 'test-timeout', pattern: /Test timeout of/ },
  { mechanism: 'navigation', pattern: /page\.goto|browserContext|net::ERR/ },
  { mechanism: 'ui-timeout', pattern: /TimeoutError: (locator|page|frame)\./ },
  { mechanism: 'ui-state', pattern: /expect\((locator|page)\)\./ },
  { mechanism: 'api-status', pattern: /toHaveStatusCode/ },
  { mechanism: 'data-assertion', pattern: /expect\(received\)\./ },
];

/** Strips terminal colouring and collapses to the first line, which carries the signal. */
export const normalizeErrorMessage = (message: string): string =>
  message.replace(ANSI_COLOR, '').split('\n')[0].trim();

/**
 * Buckets a failure by what kind of problem it is. Covered ~95% of sampled Playwright failures
 * on `kibana-on-merge`; anything unmatched is `unclassified` rather than forced into a bucket.
 */
export const classifyMechanism = (errorMessage: string | undefined): Mechanism => {
  if (!errorMessage) {
    return 'unclassified';
  }

  const normalized = normalizeErrorMessage(errorMessage);

  for (const { mechanism, pattern } of RULES) {
    if (pattern.test(normalized)) {
      return mechanism;
    }
  }

  return 'unclassified';
};

/** Mechanisms that describe a broken environment rather than a broken test. */
const NOT_A_TEST_BUG: ReadonlySet<Mechanism> = new Set<Mechanism>(['infra']);

/**
 * Whether an automated fix attempt makes sense for this mechanism. Measurement found 16.2% of
 * "flaky" Playwright failures were dependency errors, where changing the test is the wrong fix.
 */
export const isFixCandidate = (mechanism: Mechanism): boolean => !NOT_A_TEST_BUG.has(mechanism);

/** Picks the mechanism accounting for the most failures, with a stable tie-break. */
export const dominantMechanism = (breakdown: Partial<Record<Mechanism, number>>): Mechanism => {
  const entries = Object.entries(breakdown) as Array<[Mechanism, number]>;

  if (entries.length === 0) {
    return 'unclassified';
  }

  return entries.reduce((best, current) => {
    if (current[1] !== best[1]) {
      return current[1] > best[1] ? current : best;
    }
    return current[0] < best[0] ? current : best;
  })[0];
};
