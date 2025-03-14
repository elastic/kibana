/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreServices } from '../services/kibana_services';

interface PresentationCapabilities {
  canAccessDashboards: boolean;
  canCreateNewDashboards: boolean;
  canSaveVisualizations: boolean;
  canSetAdvancedSettings: boolean;
}

export const getPresentationCapabilities = (): PresentationCapabilities => {
  const {
    dashboard_v2: dashboard,
    visualize_v2: visualize,
    advancedSettings,
  } = coreServices.application.capabilities;

  return {
    canAccessDashboards: Boolean(dashboard.show),
    canCreateNewDashboards: Boolean(dashboard.createNew),
    canSaveVisualizations: Boolean(visualize.save),
    canSetAdvancedSettings: Boolean(advancedSettings.save),
  };
};
