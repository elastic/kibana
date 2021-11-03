/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockCoreContext } from '../../core_context.mock';
import { httpServiceMock } from '../../http/http_service.mock';
import { pluginServiceMock } from '../../plugins/plugins_service.mock';
import { statusServiceMock } from '../../status/status_service.mock';

const context = mockCoreContext.create();
const httpPreboot = httpServiceMock.createInternalPrebootContract();
const httpSetup = httpServiceMock.createInternalSetupContract();
const status = statusServiceMock.createInternalSetupContract();

export const mockRenderingServiceParams = context;
export const mockRenderingPrebootDeps = {
  http: httpPreboot,
  uiPlugins: pluginServiceMock.createUiPlugins(),
};
export const mockRenderingSetupDeps = {
  http: httpSetup,
  uiPlugins: pluginServiceMock.createUiPlugins(),
  status,
};
