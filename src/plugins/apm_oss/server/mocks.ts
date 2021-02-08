/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import { APMOSSConfig } from '.';
import { APMOSSPluginSetup } from './plugin';

const apmStar = 'apm-*';

const defaultConfig = {
  enabled: true,
  errorIndices: apmStar,
  indexPattern: apmStar,
  metricsIndices: apmStar,
  onboardingIndices: apmStar,
  sourcemapIndices: apmStar,
  spanIndices: apmStar,
  transactionIndices: apmStar,
};

export const apmOSSPluginSetupMock = {
  create(config: Partial<APMOSSConfig> = {}): APMOSSPluginSetup {
    return {
      config: { ...defaultConfig, ...config },
      config$: of({ ...defaultConfig, ...config }),
      getRegisteredTutorialProvider: jest.fn(),
    };
  },
};
