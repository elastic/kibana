/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardHTTPService } from './types';

type HttpServiceFactory = PluginServiceFactory<DashboardHTTPService>;

export const httpServiceFactory: HttpServiceFactory = () => {
  const serviceMock = coreMock.createStart();

  return {
    basePath: serviceMock.http.basePath,
  };
};
