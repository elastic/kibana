/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inList } from './esql';
import type { TestFramework } from './schema';

/**
 * How one execution of a test is identified per framework.
 *
 * Jest, FTR and Cypress emit a single `test-end` per test per run. Playwright retries inside a
 * run and emits one `test-end` per attempt, so its per-run verdict is the `test-outcome` event
 * instead; counting its `test-end` events would inflate rates for tests that recover on retry.
 */
export interface ExecutionModel {
  frameworks: readonly TestFramework[];
  /** Filter selecting exactly one document per run, including runs where the test was skipped. */
  runFilter: string;
  /** Filter selecting exactly one document per execution. */
  executionFilter: string;
  /** Filter selecting only failed executions. */
  failureFilter: string;
  /** ES|QL expression evaluating to 1 for a failed execution, 0 otherwise. */
  failedExpression: string;
  /** ES|QL expression evaluating to 1 when the execution failed then passed within the run. */
  retryFlakeExpression: string;
}

/** Frameworks whose per-run verdict is the single `test-end` event they emit. */
export const ATTEMPT_MODEL_FRAMEWORKS: readonly TestFramework[] = ['jest', 'ftr', 'cypress'];
/** Frameworks whose per-run verdict is the `test-outcome` event summarising all attempts. */
export const OUTCOME_MODEL_FRAMEWORKS: readonly TestFramework[] = ['playwright'];

/** One model per event shape, each covering the subset of `frameworks` that uses it. */
export const buildExecutionModels = (frameworks: readonly TestFramework[]): ExecutionModel[] => {
  const models: ExecutionModel[] = [];

  const attemptFrameworks = ATTEMPT_MODEL_FRAMEWORKS.filter((fw) => frameworks.includes(fw));
  if (attemptFrameworks.length > 0) {
    const reporterFilter = `reporter.type IN (${inList(attemptFrameworks)})`;
    models.push({
      frameworks: attemptFrameworks,
      runFilter: `(event.action == "test-end" AND ${reporterFilter})`,
      executionFilter: `(event.action == "test-end" AND ${reporterFilter} AND test.status IN ("passed", "failed", "timedOut"))`,
      failureFilter: `(event.action == "test-end" AND ${reporterFilter} AND test.status IN ("failed", "timedOut"))`,
      failedExpression: 'CASE(test.status IN ("failed", "timedOut"), 1, 0)',
      retryFlakeExpression: '0',
    });
  }

  const outcomeFrameworks = OUTCOME_MODEL_FRAMEWORKS.filter((fw) => frameworks.includes(fw));
  if (outcomeFrameworks.length > 0) {
    const reporterFilter = `reporter.type IN (${inList(outcomeFrameworks)})`;
    models.push({
      frameworks: outcomeFrameworks,
      runFilter: `(event.action == "test-outcome" AND ${reporterFilter})`,
      executionFilter: `(event.action == "test-outcome" AND ${reporterFilter} AND test.outcome IN ("expected", "unexpected", "flaky"))`,
      failureFilter: `(event.action == "test-outcome" AND ${reporterFilter} AND test.outcome IN ("unexpected", "flaky"))`,
      failedExpression: 'CASE(test.outcome IN ("unexpected", "flaky"), 1, 0)',
      retryFlakeExpression: 'CASE(test.outcome == "flaky", 1, 0)',
    });
  }

  return models;
};
