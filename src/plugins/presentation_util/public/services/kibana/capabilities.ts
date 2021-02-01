/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PresentationUtilPluginStartDeps } from '../../types';
import { KibanaPluginServiceFactory } from '../create';
import { PresentationCapabilitiesService } from '..';

export type CapabilitiesServiceFactory = KibanaPluginServiceFactory<
  PresentationCapabilitiesService,
  PresentationUtilPluginStartDeps
>;

export const capabilitiesServiceFactory: CapabilitiesServiceFactory = ({ coreStart }) => {
  const { dashboard } = coreStart.application.capabilities;

  return {
    canAccessDashboards: () => Boolean(dashboard.show),
    canCreateNewDashboards: () => Boolean(dashboard.createNew),
    canEditDashboards: () => !Boolean(dashboard.hideWriteControls),
  };
};
