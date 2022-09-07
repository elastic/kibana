/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardFeatureFlagConfig } from '../..';
import { DashboardPluginServiceParams } from '../types';
import { DashboardInitializerContextService } from './types';

export type InitializerContextServiceFactory = (
  params: DashboardPluginServiceParams
) => DashboardInitializerContextService;

export const initializerContextServiceFactory: InitializerContextServiceFactory = ({
  initContext,
}) => {
  const {
    env: {
      packageInfo: { version },
    },
    config: { get },
  } = initContext;

  return {
    kibanaVersion: version,
    allowByValueEmbeddables: get<DashboardFeatureFlagConfig>().allowByValueEmbeddables,
  };
};
