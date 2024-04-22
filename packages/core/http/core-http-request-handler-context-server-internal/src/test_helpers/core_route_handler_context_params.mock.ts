/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { deprecationsServiceMock } from '@kbn/core-deprecations-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';

export const createCoreRouteHandlerContextParamsMock = () => {
  return {
    elasticsearch: elasticsearchServiceMock.createInternalStart(),
    savedObjects: savedObjectsServiceMock.createInternalStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    deprecations: deprecationsServiceMock.createInternalStartContract(),
    security: securityServiceMock.createInternalStart(),
  };
};
