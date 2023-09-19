/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardStartDependencies } from '../../plugin';
import { DashboardServerlessService } from './types';

export type ServerlessServiceFactory = KibanaPluginServiceFactory<
  DashboardServerlessService,
  DashboardStartDependencies
>;

export const serverlessServiceFactory: ServerlessServiceFactory = ({ startPlugins }) => {
  const { serverless } = startPlugins;

  return { setBreadcrumbs: serverless?.setBreadcrumbs };
};
