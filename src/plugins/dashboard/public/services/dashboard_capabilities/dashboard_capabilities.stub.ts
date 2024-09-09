/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardCapabilitiesService } from './types';

const defaultDashboardCapabilities: DashboardCapabilitiesService = {
  show: true,
  createNew: true,
  saveQuery: true,
  createShortUrl: true,
  showWriteControls: true,
  storeSearchSession: true,
  mapsCapabilities: { save: true },
  visualizeCapabilities: { save: true },
};

type DashboardCapabilitiesServiceFactory = PluginServiceFactory<DashboardCapabilitiesService>;

export const dashboardCapabilitiesServiceFactory: DashboardCapabilitiesServiceFactory = () => {
  return {
    ...defaultDashboardCapabilities,
  };
};
