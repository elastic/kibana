/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { ContextService } from '@kbn/core-http-context-server-internal';
import { createHttpServer, createCoreContext } from '@kbn/core-http-server-mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { contextServiceMock, coreMock } from '../../../mocks';

const defaultCoreId = Symbol('core');

export const setupServer = async (coreId: symbol = defaultCoreId) => {
  const coreContext = createCoreContext({ coreId });
  const contextService = new ContextService(coreContext);

  const server = createHttpServer(coreContext);
  await server.preboot({ context: contextServiceMock.createPrebootContract() });
  const httpSetup = await server.setup({
    context: contextService.setup({ pluginDependencies: new Map() }),
    executionContext: executionContextServiceMock.createInternalSetupContract(),
  });
  const handlerContext = coreMock.createRequestHandlerContext();

  httpSetup.registerRouteHandlerContext<any, 'core'>(coreId, 'core', (ctx, req, res) => {
    return handlerContext;
  });

  return {
    server,
    httpSetup,
    handlerContext,
  };
};

export const createExportableType = (name: string): SavedObjectsType => {
  return {
    name,
    hidden: false,
    namespaceType: 'single',
    mappings: {
      properties: {},
    },
    management: {
      importableAndExportable: true,
    },
  };
};
