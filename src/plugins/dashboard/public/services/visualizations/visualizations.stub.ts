/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { VisualizationsStart } from '@kbn/visualizations-plugin/public';
import { DashboardVisualizationsService } from './types';

type HttpServiceFactory = PluginServiceFactory<DashboardVisualizationsService>;

export const visualizationsServiceFactory: HttpServiceFactory = () => {
  return {
    get: {} as unknown as VisualizationsStart['get'],
    getAliases: {} as unknown as VisualizationsStart['getAliases'],
    getByGroup: {} as unknown as VisualizationsStart['getByGroup'],
    showNewVisModal: {} as unknown as VisualizationsStart['showNewVisModal'],
  };
};
