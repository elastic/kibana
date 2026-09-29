/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { getCachedAllConnectors } from './connectors_cache';

vi.mock('../../../../common/schema', () => {
      const mocked = {
      getAllConnectors: vi.fn(() => [{ type: 'static-connector' }]),
      getAllConnectorsWithDynamic: vi.fn((dynamic: Record<string, unknown>) => [
        { type: 'static-connector' },
        { type: 'dynamic-connector' },
      ]),
    };
      return { ...mocked, default: mocked };
    });

describe('getCachedAllConnectors', () => {
  it('returns static connectors when no dynamic types are provided', () => {
    const result = getCachedAllConnectors();
    expect(result).toEqual([{ type: 'static-connector' }]);
  });

  it('returns connectors with dynamic types when provided', () => {
    const dynamicTypes = { myConnector: {} as never };
    const result = getCachedAllConnectors(dynamicTypes);
    expect(result).toEqual([{ type: 'static-connector' }, { type: 'dynamic-connector' }]);
  });
});
