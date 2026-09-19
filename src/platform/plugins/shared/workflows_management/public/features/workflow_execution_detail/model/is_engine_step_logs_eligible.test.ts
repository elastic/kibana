/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEngineStepLogsEligible } from './is_engine_step_logs_eligible';

describe('isEngineStepLogsEligible', () => {
  it('skips overview and trigger pseudo-steps', () => {
    expect(isEngineStepLogsEligible('__overview', 'Overview')).toBe(false);
    expect(isEngineStepLogsEligible('trigger_manual', 'trigger')).toBe(false);
    expect(isEngineStepLogsEligible(undefined, 'trigger')).toBe(false);
  });

  it('allows real engine steps', () => {
    expect(isEngineStepLogsEligible('custom.exampleStep', 'abc-123')).toBe(true);
    expect(isEngineStepLogsEligible('elasticsearch.search', 'step-exec-id')).toBe(true);
  });
});
