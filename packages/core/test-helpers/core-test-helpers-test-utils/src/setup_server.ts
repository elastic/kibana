/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { ContextService } from '@kbn/core-http-context-server-internal';
import { createHttpService, createCoreContext } from '@kbn/core-http-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { deprecationsServiceMock } from '@kbn/core-deprecations-server-mocks';

const defaultCoreId = Symbol('core');

function createCoreServerRequestHandlerContextMock() {
  return {
    savedObjects: {
      client: savedObjectsClientMock.create(),
      typeRegistry: typeRegistryMock.create(),
      getClient: savedObjectsClientMock.create,
      getExporter: savedObjectsServiceMock.createExporter,
      getImporter: savedObjectsServiceMock.createImporter,
    },
    elasticsearch: {
      client: elasticsearchServiceMock.createScopedClusterClient(),
    },
    uiSettings: {
      client: uiSettingsServiceMock.createClient(),
    },
    deprecations: {
      client: deprecationsServiceMock.createClient(),
    },
  };
}
export const setupServer = async (coreId: symbol = defaultCoreId) => {
  const coreContext = createCoreContext({ coreId });
  const contextService = new ContextService(coreContext);

  const server = createHttpService(coreContext);
  await server.preboot({ context: contextServiceMock.createPrebootContract() });
  const httpSetup = await server.setup({
    context: contextService.setup({ pluginDependencies: new Map() }),
    executionContext: executionContextServiceMock.createInternalSetupContract(),
  });
  const handlerContext = createCoreServerRequestHandlerContextMock();

  httpSetup.registerRouteHandlerContext<any, 'core'>(coreId, 'core', (ctx, req, res) => {
    return handlerContext;
  });

  return {
    server,
    httpSetup,
    handlerContext,
  };
};
