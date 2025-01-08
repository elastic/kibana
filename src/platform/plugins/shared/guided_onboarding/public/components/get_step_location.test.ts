/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginState } from '../../common';
import { testGuideStep4ActiveState } from '../services/api.mocks';
import { getStepLocationPath } from './get_step_location';

describe('getStepLocationPath', () => {
  let result: string | undefined;
  const pathWithParams = 'testPath/{param1}/{param2}';
  const pathWithoutParams = 'testPath';
  const pluginStateWithoutParams: PluginState = {
    status: 'in_progress',
    isActivePeriod: true,
    activeGuide: testGuideStep4ActiveState,
  };

  it('returns initial location path if no params passed', () => {
    result = getStepLocationPath(pathWithParams, pluginStateWithoutParams);
    expect(result).toBe(pathWithParams);
  });

  it('returns dynamic location path if params passed', () => {
    const pluginStateWithParams: PluginState = {
      status: 'in_progress',
      isActivePeriod: true,
      activeGuide: { ...testGuideStep4ActiveState, params: { param1: 'test1', param2: 'test2' } },
    };
    result = getStepLocationPath(pathWithParams, pluginStateWithParams);
    expect(result).toBe(`testPath/test1/test2`);
  });

  it('returns initial location path if params passed but no params are used in the location', () => {
    const pluginStateWithParams: PluginState = {
      status: 'in_progress',
      isActivePeriod: true,
      activeGuide: { ...testGuideStep4ActiveState, params: { indexName: 'test1234' } },
    };
    result = getStepLocationPath(pathWithoutParams, pluginStateWithParams);
    expect(result).toBe(`testPath`);
  });
});
