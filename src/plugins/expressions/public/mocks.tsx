/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { ExpressionsSetup, ExpressionsStart, plugin as pluginInitializer } from '.';

export type Setup = jest.Mocked<ExpressionsSetup>;
export type Start = jest.Mocked<ExpressionsStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    fork: jest.fn(),
    getFunction: jest.fn(),
    getFunctions: jest.fn(),
    getTypes: jest.fn(),
    registerFunction: jest.fn(),
    registerRenderer: jest.fn(),
    registerType: jest.fn(),
    getAllMigrations: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  return {
    execute: jest.fn(),
    getFunction: jest.fn(),
    getFunctions: jest.fn(),
    getRenderer: jest.fn(),
    getRenderers: jest.fn(),
    getType: jest.fn(),
    getTypes: jest.fn(),
    loader: jest.fn(),
    render: jest.fn(),
    ReactExpressionRenderer: jest.fn((props) => <></>),
    run: jest.fn(),
    telemetry: jest.fn(),
    extract: jest.fn(),
    inject: jest.fn(),
    getAllMigrations: jest.fn(),
  };
};

const createPlugin = async () => {
  const pluginInitializerContext = coreMock.createPluginInitializerContext();
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const plugin = pluginInitializer(pluginInitializerContext);
  const setup = await plugin.setup(coreSetup);

  return {
    pluginInitializerContext,
    coreSetup,
    coreStart,
    plugin,
    setup,
    doStart: async () => await plugin.start(coreStart),
  };
};

export const expressionsPluginMock = {
  createSetupContract,
  createStartContract,
  createPlugin,
};
