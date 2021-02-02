/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ContextService } from '../../context';
import { createHttpServer, createCoreContext } from '../../http/test_utils';
import { coreMock } from '../../mocks';
import { SavedObjectsType } from '../types';

const defaultCoreId = Symbol('core');

export const setupServer = async (coreId: symbol = defaultCoreId) => {
  const coreContext = createCoreContext({ coreId });
  const contextService = new ContextService(coreContext);

  const server = createHttpServer(coreContext);
  const httpSetup = await server.setup({
    context: contextService.setup({ pluginDependencies: new Map() }),
  });
  const handlerContext = coreMock.createRequestHandlerContext();

  httpSetup.registerRouteHandlerContext(coreId, 'core', async (ctx, req, res) => {
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
