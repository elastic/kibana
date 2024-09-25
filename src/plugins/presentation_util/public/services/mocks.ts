/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';

import { setKibanaServices } from './kibana_services';

export const setStubKibanaServices = () => {
  const core = coreMock.createStart();
  // (core.application.capabilities as any).dashboard = defaultDashboardCapabilities;

  setKibanaServices(core, {
    contentManagement: contentManagementMock.createStartContract(),
    uiActions: uiActionsPluginMock.createStartContract(),
    dataViews: dataViewPluginMocks.createStartContract(),
  });
};
