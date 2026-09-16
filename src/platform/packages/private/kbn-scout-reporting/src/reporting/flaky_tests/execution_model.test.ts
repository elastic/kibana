/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ATTEMPT_MODEL_FRAMEWORKS,
  buildExecutionModels,
  OUTCOME_MODEL_FRAMEWORKS,
} from './execution_model';
import { TEST_FRAMEWORKS } from './schema';

describe('buildExecutionModels', () => {
  it('covers every framework with exactly one model', () => {
    expect([...ATTEMPT_MODEL_FRAMEWORKS, ...OUTCOME_MODEL_FRAMEWORKS].sort()).toEqual(
      [...TEST_FRAMEWORKS].sort()
    );
  });

  it('returns no models when no frameworks are requested', () => {
    expect(buildExecutionModels([])).toEqual([]);
  });

  it('groups jest, ftr and cypress into a single test-end model', () => {
    const models = buildExecutionModels(['jest', 'cypress']);

    expect(models).toHaveLength(1);
    expect(models[0].frameworks).toEqual(['jest', 'cypress']);
    expect(models[0].runFilter).toBe(
      '(event.action == "test-end" AND reporter.type IN ("jest", "cypress"))'
    );
    expect(models[0].executionFilter).toContain('test.status IN ("passed", "failed", "timedOut")');
    expect(models[0].failureFilter).toContain('test.status IN ("failed", "timedOut")');
    expect(models[0].failedExpression).toBe('CASE(test.status IN ("failed", "timedOut"), 1, 0)');
    // there is no in-run retry for these frameworks, so nothing can flip within a run
    expect(models[0].retryFlakeExpression).toBe('0');
  });

  it('models playwright on test-outcome events so retries do not inflate run counts', () => {
    const models = buildExecutionModels(['playwright']);

    expect(models).toHaveLength(1);
    expect(models[0].frameworks).toEqual(['playwright']);
    expect(models[0].runFilter).toBe(
      '(event.action == "test-outcome" AND reporter.type IN ("playwright"))'
    );
    expect(models[0].executionFilter).toContain(
      'test.outcome IN ("expected", "unexpected", "flaky")'
    );
    expect(models[0].failureFilter).toContain('test.outcome IN ("unexpected", "flaky")');
    expect(models[0].failedExpression).toBe('CASE(test.outcome IN ("unexpected", "flaky"), 1, 0)');
    expect(models[0].retryFlakeExpression).toBe('CASE(test.outcome == "flaky", 1, 0)');
  });

  it('returns one model per event shape when both are requested', () => {
    const models = buildExecutionModels([...TEST_FRAMEWORKS]);

    expect(models.map((model) => model.frameworks)).toEqual([
      ['jest', 'ftr', 'cypress'],
      ['playwright'],
    ]);
  });
});
