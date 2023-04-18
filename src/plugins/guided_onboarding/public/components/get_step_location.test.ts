/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { StepConfig } from '@kbn/guided-onboarding';
import type { PluginState } from '../../common';
import { testGuideStep4ActiveState } from '../services/api.mocks';
import { getStepLocationPath } from './get_step_location';

describe('getStepLocationPath', () => {
  let result: string | undefined;
  const locationWithParams: StepConfig['location'] = {
    appID: 'testApp',
    path: 'testPath/{indexName}',
    params: ['indexName'],
  };
  const locationWithoutParams: StepConfig['location'] = {
    appID: 'testApp',
    path: 'testPath',
  };
  const pluginStateWithoutParams: PluginState = {
    status: 'in_progress',
    isActivePeriod: true,
    activeGuide: testGuideStep4ActiveState,
  };

  it('returns initial location path if no params passed', () => {
    result = getStepLocationPath(locationWithParams, pluginStateWithoutParams);
    expect(result).toBe(locationWithParams.path);
  });

  it('returns dynamic location path if params passed', () => {
    const pluginStateWithParams: PluginState = {
      status: 'in_progress',
      isActivePeriod: true,
      activeGuide: { ...testGuideStep4ActiveState, params: { indexName: 'testIndex' } },
    };
    result = getStepLocationPath(locationWithParams, pluginStateWithParams);
    expect(result).toBe(`testPath/testIndex`);
  });

  it('returns initial location path if params passed but no params are used in the location', () => {
    const pluginStateWithParams: PluginState = {
      status: 'in_progress',
      isActivePeriod: true,
      activeGuide: { ...testGuideStep4ActiveState, params: { indexName: 'test1234' } },
    };
    result = getStepLocationPath(locationWithoutParams, pluginStateWithParams);
    expect(result).toBe(`testPath`);
  });
});
