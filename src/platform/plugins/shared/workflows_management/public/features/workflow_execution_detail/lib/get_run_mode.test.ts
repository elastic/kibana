/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRunMode } from './get_run_mode';

describe('getRunMode', () => {
  it('returns production when isTestRun is false', () => {
    expect(getRunMode({ isTestRun: false })).toEqual({ runMode: 'production' });
  });

  it('returns test when isTestRun without stepId', () => {
    expect(getRunMode({ isTestRun: true })).toEqual({ runMode: 'test' });
  });

  it('returns stepTest with target name when stepId is set', () => {
    expect(getRunMode({ isTestRun: true, stepId: 'search_parks' })).toEqual({
      runMode: 'stepTest',
      stepTestTargetName: 'search_parks',
    });
  });
});
