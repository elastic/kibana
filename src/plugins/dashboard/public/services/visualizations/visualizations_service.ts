/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import type { DashboardStartDependencies } from '../../plugin';
import type { DashboardVisualizationsService } from './types';

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
