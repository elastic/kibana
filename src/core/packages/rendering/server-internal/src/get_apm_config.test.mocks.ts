/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const getConfigurationMock = vi.fn();
export const shouldInstrumentClientMock = vi.fn(() => true);
vi.doMock('@kbn/apm-config-loader', () => {
      const mocked = {
      getConfiguration: getConfigurationMock,
      shouldInstrumentClient: shouldInstrumentClientMock,
    };
      return { ...mocked, default: mocked };
    });

export const agentMock = {} as Record<string, any>;
vi.doMock('elastic-apm-node', () => agentMock);
