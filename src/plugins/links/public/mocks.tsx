/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dashboardPluginMock } from '@kbn/dashboard-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { presentationUtilPluginMock } from '@kbn/presentation-util-plugin/public/mocks';
import { setKibanaServices } from './services/kibana_services';

export const setStubKibanaServices = () => {
  const core = coreMock.createStart();

  setKibanaServices(core, {
    dashboard: dashboardPluginMock.createStartContract(),
    embeddable: embeddablePluginMock.createStartContract(),
    contentManagement: contentManagementMock.createStartContract(),
    presentationUtil: presentationUtilPluginMock.createStartContract(core),
  });
};
