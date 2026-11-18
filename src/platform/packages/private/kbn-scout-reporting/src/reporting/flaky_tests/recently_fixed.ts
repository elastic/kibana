/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SetupBuilds } from './breakages';
import { describeScope, scopeKey, type JudgedScope } from './judged_scope';

/** A test may be fixed once its last failure on a branch is at least this old. */
export const MIN_HOURS_SINCE_LAST_FAILURE = 24;

/**
 * A test is fixed once the builds since its last failure are enough that, failing as often as
 * before, it would have failed this many times in them on average.
 */
export const MIN_MISSED_FAILURES = 1.5;

/**
 * When a test last failed on a branch, of a pipeline when it is judged on its own, and how many
 * builds ran it without failing since.
 */
export interface LastFailure extends JudgedScope {
  at: Date;
  cleanBuilds: number;
}

const latest = (a?: Date, b?: Date): Date | undefined => (!a || (b && b > a) ? b : a);

/**
 * Per branch, the test's last failure, a breakage included, and the builds that ran it since. A
 * breakage is not flakiness, but the test may have changed to end it, so it counts here. Only the
 * setups where the test failed are read, so the clean builds of the others are not counted: a
 * test can only look less fixed for it.
 */
export const lastFailures = (setups: readonly SetupBuilds[]): LastFailure[] => {
  const byScope = new Map<
    string,
    { scope: JudgedScope; builds: Map<string, { ranAt: Date; failedAt?: Date }> }
  >();
  for (const { branch, pipeline, builds } of setups) {
    const scope = { branch, ...(pipeline ? { pipeline } : {}) };
    const scoped = byScope.get(scopeKey(scope)) ?? { scope, builds: new Map() };
    for (const { buildId, ranAt, failedAt } of builds) {
      const existing = scoped.builds.get(buildId);
      scoped.builds.set(buildId, {
        ranAt: existing && existing.ranAt < ranAt ? existing.ranAt : ranAt,
        failedAt: latest(existing?.failedAt, failedAt),
      });
    }
    byScope.set(scopeKey(scope), scoped);
  }

  return [...byScope.values()].flatMap(({ scope, builds }) => {
    const failures = [...builds.values()].flatMap(({ failedAt }) =>
      failedAt ? [failedAt.getTime()] : []
    );
    if (failures.length === 0) {
      return [];
    }
    const at = Math.max(...failures);
    const cleanBuilds = [...builds.values()].filter(({ ranAt }) => ranAt.getTime() > at).length;
    return [{ ...scope, at: new Date(at), cleanBuilds }];
  });
};

const HOUR_MS = 60 * 60 * 1000;

/** Whether a test failing a share `rate` of its builds on the branch looks fixed there by `now`. */
export const looksFixed = ({ at, cleanBuilds }: LastFailure, rate: number, now: Date): boolean =>
  now.getTime() - at.getTime() >= MIN_HOURS_SINCE_LAST_FAILURE * HOUR_MS &&
  cleanBuilds * rate >= MIN_MISSED_FAILURES;

/** `no failures in the 73 builds on 9.5 since 2026-10-20` */
export const describeFix = (lastFailure: LastFailure): string =>
  `no failures in the ${lastFailure.cleanBuilds} builds on ${describeScope(
    lastFailure
  )} since ${lastFailure.at.toISOString().slice(0, 10)}`;
