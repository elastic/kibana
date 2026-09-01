/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ExecutionContext } from '@kbn/expressions-plugin/public';
import type { VegaVisualizationDependencies } from './plugin';
import type { VegaInspectorAdapters } from './vega_inspector';
import { createVegaFn } from './vega_fn';

const mockVegaRequestHandler = jest.fn();
const mockCreateVegaRequestHandler = jest.fn(() => mockVegaRequestHandler);

jest.mock('./async_services', () => ({
  createVegaRequestHandler: mockCreateVegaRequestHandler,
}));

describe('createVegaFn', () => {
  const visualizationDependencies = {
    core: coreMock.createSetup(),
    plugins: { data: dataPluginMock.createSetupContract() },
    getServiceSettings: jest.fn(),
  } as unknown as VegaVisualizationDependencies;

  const executionContext = {
    getSearchSessionId: () => 'session-1',
    getExecutionContext: () => ({ type: 'visualization' }),
    getSearchContext: () => ({ isApproximate: false }),
  } as unknown as ExecutionContext<VegaInspectorAdapters>;

  beforeEach(() => {
    mockCreateVegaRequestHandler.mockClear();
    mockVegaRequestHandler.mockReset();
    mockVegaRequestHandler.mockResolvedValue({});
  });

  it('forwards kibana_context esqlVariables to the request handler', async () => {
    const esqlVariables = [{ key: 'fizzbuzz', value: 'ios', type: ESQLVariableType.VALUES }];
    const fn = createVegaFn(visualizationDependencies);

    await fn.fn(
      {
        type: 'kibana_context',
        esqlVariables,
        timeRange: { from: 'now-15m', to: 'now' },
        query: { language: 'kuery', query: '' },
        filters: [],
      },
      { spec: '{ mark: point }' },
      executionContext
    );

    expect(mockVegaRequestHandler).toHaveBeenCalledWith(expect.objectContaining({ esqlVariables }));
  });
});
