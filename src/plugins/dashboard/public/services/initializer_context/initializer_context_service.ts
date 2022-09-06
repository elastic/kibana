/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { DashboardFeatureFlagConfig } from '../..';
import { DashboardPluginServiceParams } from '../types';
import { DashboardInitializerContextServiceType } from './types';

export type InitializerContextServiceFactory = (
  params: DashboardPluginServiceParams
) => DashboardInitializerContextServiceType;

class InitializerContextService implements DashboardInitializerContextServiceType {
  public kibanaVersion: string;
  public allowByValueEmbeddables: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.allowByValueEmbeddables =
      initializerContext.config.get<DashboardFeatureFlagConfig>().allowByValueEmbeddables;
  }
}

export const initializerContextServiceFactory: InitializerContextServiceFactory = ({
  initContext,
}) => {
  return new InitializerContextService(initContext);
};
