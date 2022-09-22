/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginName } from '@kbn/core-base-common';
import type { Plugin } from '@kbn/core-plugins-browser';

export type MockedPluginInitializer = jest.Mock<Plugin<unknown, unknown>>;

export const mockPluginInitializerProvider: jest.Mock<MockedPluginInitializer, [PluginName]> = jest
  .fn()
  .mockImplementation(() => () => {
    throw new Error('No provider specified');
  });

jest.mock('./plugin_reader', () => ({
  read: mockPluginInitializerProvider,
}));
