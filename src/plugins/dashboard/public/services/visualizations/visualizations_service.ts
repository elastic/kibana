/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardStartDependencies } from '../../plugin';
import { DashboardVisualizationsService } from './types';

export type VisualizationsServiceFactory = KibanaPluginServiceFactory<
  DashboardVisualizationsService,
  DashboardStartDependencies
>;

export const visualizationsServiceFactory: VisualizationsServiceFactory = ({ startPlugins }) => {
  const {
    visualizations: { get, getAliases, getByGroup, showNewVisModal },
  } = startPlugins;

  return {
    get,
    getAliases,
    getByGroup,
    showNewVisModal,
  };
};
