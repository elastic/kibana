/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { PluginName } from '@kbn/core-base-common';
import type { PluginDefinition } from './plugin_reader';
import { createRuntimePluginContractResolverMock } from './test_helpers';

export const mockPluginInitializerProvider: Mock<(...args: [PluginName]) => PluginDefinition> = vi
  .fn()
  .mockImplementation(() => () => {
    throw new Error('No provider specified');
  });

vi.mock('./plugin_reader', () => {
  const mocked = {
    read: mockPluginInitializerProvider,
  };
  return { ...mocked, default: mocked };
});

export const runtimeResolverMock = createRuntimePluginContractResolverMock();

vi.doMock('./plugin_contract_resolver', () => {
  return {
    RuntimePluginContractResolver: vi.fn().mockImplementation(() => runtimeResolverMock),
  };
});
