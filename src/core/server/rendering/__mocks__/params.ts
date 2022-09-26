/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { statusServiceMock } from '@kbn/core-status-server-mocks';
import { pluginServiceMock } from '../../plugins/plugins_service.mock';

const context = mockCoreContext.create();
const httpPreboot = httpServiceMock.createInternalPrebootContract();
const httpSetup = httpServiceMock.createInternalSetupContract();
const status = statusServiceMock.createInternalSetupContract();
const elasticsearch = elasticsearchServiceMock.createInternalSetup();

export const mockRenderingServiceParams = context;
export const mockRenderingPrebootDeps = {
  http: httpPreboot,
  uiPlugins: pluginServiceMock.createUiPlugins(),
};
export const mockRenderingSetupDeps = {
  elasticsearch,
  http: httpSetup,
  uiPlugins: pluginServiceMock.createUiPlugins(),
  status,
};
