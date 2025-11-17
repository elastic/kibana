/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { throwOnUnmappedKeys } from './scope_tooling';
import type { DashboardState } from './types';

const mockGetTransforms = jest.fn();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../kibana_services').embeddableService = {
    getTransforms: mockGetTransforms,
  };
});

beforeEach(() => {
  mockGetTransforms.mockReset();
});

describe('throwOnUnmappedKeys', () => {
  it('should not throw when there are no unmapped keys', () => {
    mockGetTransforms.mockImplementation(() => {
      return {
        schema: schema.object({
          foo: schema.string(),
        }),
      };
    });
    const dashboardState = {
      title: 'my dashboard',
      panels: [
        {
          config: {
            foo: 'some value',
          },
          grid: {
            h: 15,
            w: 24,
            x: 0,
            y: 0,
          },
          type: 'typeWithSchema',
        },
      ],
    };
    expect(() => throwOnUnmappedKeys(dashboardState)).not.toThrow();
  });

  it('should throw dashboard contains a panel without a schema', () => {
    const dashboardState = {
      title: 'my dashboard',
      panels: [
        {
          config: {
            foo: 'some value',
          },
          grid: {
            h: 15,
            w: 24,
            x: 0,
            y: 0,
          },
          type: 'typeWithoutSchema',
        },
      ],
    };
    expect(() => throwOnUnmappedKeys(dashboardState)).toThrow();
  });

  it('should throw dashboard contains references', () => {
    const dashboardState = {
      panels: [],
      title: 'my dashboard',
      references: [],
    };
    expect(() => throwOnUnmappedKeys(dashboardState)).toThrow();
  });

  it('should throw dashboard contains controlGroupInput', () => {
    const dashboardState = {
      controlGroupInput: {} as unknown as DashboardState['controlGroupInput'],
      panels: [],
      title: 'my dashboard',
    };
    expect(() => throwOnUnmappedKeys(dashboardState)).toThrow();
  });
});
