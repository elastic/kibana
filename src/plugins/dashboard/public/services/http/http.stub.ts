/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from '@kbn/core/public';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardHTTPService } from './types';

type HttpServiceFactory = PluginServiceFactory<DashboardHTTPService>;

export const httpServiceFactory: HttpServiceFactory = () => {
  return {
    basePath: {} as unknown as CoreSetup['http']['basePath'],
  };
};
