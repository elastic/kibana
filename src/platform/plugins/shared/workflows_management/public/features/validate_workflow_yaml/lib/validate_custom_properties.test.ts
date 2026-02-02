/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSchemaAtPath } from '@kbn/workflows/common/utils/zod/get_schema_at_path';
import { z } from '@kbn/zod/v4';

// Mock the dependencies
jest.mock('../../../../common/step_schemas', () => ({
  stepSchemas: {
    getAllConnectorsMapCache: jest.fn(),
  },
}));

jest.mock('@kbn/workflows/common/utils/zod/get_schema_at_path', () => ({
  getSchemaAtPath: jest.fn(),
}));

jest.mock('../../../shared/lib/custom_property_selection_cache', () => ({
  getCachedOption: jest.fn(),
  getCachedSearchOption: jest.fn(),
  getCacheKeyForValue: jest.fn(),
  setCachedOption: jest.fn(),
}));

import { validateCustomProperties } from './validate_custom_properties';
import { stepSchemas } from '../../../../common/step_schemas';
import {
  getCachedOption,
  getCachedSearchOption,
  getCacheKeyForValue,
  setCachedOption,
} from '../../../shared/lib/custom_property_selection_cache';
import type { CustomPropertyItem } from '../model/types';

const mockGetAllConnectorsMapCache = stepSchemas.getAllConnectorsMapCache as jest.MockedFunction<
  typeof stepSchemas.getAllConnectorsMapCache
>;
const mockGetSchemaAtPath = getSchemaAtPath as jest.MockedFunction<typeof getSchemaAtPath>;
const mockGetCachedOption = getCachedOption as jest.MockedFunction<typeof getCachedOption>;
const mockGetCachedSearchOption = getCachedSearchOption as jest.MockedFunction<
  typeof getCachedSearchOption
>;
const mockGetCacheKeyForValue = getCacheKeyForValue as jest.MockedFunction<
  typeof getCacheKeyForValue
>;
const mockSetCachedOption = setCachedOption as jest.MockedFunction<typeof setCachedOption>;

describe('validateCustomProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    mockGetCachedOption.mockReturnValue(null);
    mockGetCachedSearchOption.mockReturnValue(null);
    mockGetCacheKeyForValue.mockImplementation(
      (stepType, scope, propertyKey, value) =>
        `${stepType}:${scope}:${propertyKey}:${String(value)}`
    );
  });

  it('should return error when resolve returns null and getDetails returns error message', async () => {
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn().mockResolvedValue(null),
      getDetails: jest.fn().mockResolvedValue({
        message: 'Error',
        links: [{ text: 'Link', path: '/link' }],
      }),
    };

    const mockConnector = {
      type: '1',
      configSchema: z.object({ '1': z.string() }),
    };
    mockGetAllConnectorsMapCache.mockReturnValue(new Map([['1', mockConnector as any]]));
    mockGetSchemaAtPath.mockReturnValue({ schema: z.string(), scopedToPath: '1' });

    const customPropertyItems: CustomPropertyItem[] = [
      {
        id: '1',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        yamlPath: ['1'],
        key: '1',
        selectionHandler,
        context: {
          stepType: '1',
          scope: 'config',
          propertyKey: '1',
        },
        propertyValue: '1',
        propertyKey: '1',
        stepType: '1',
        scope: 'config',
        type: 'custom-property',
      },
    ];

    const validationResults = await validateCustomProperties(customPropertyItems);

    expect(selectionHandler.resolve).toHaveBeenCalledWith('1', {
      stepType: '1',
      scope: 'config',
      propertyKey: '1',
    });
    expect(selectionHandler.getDetails).toHaveBeenCalledWith(
      '1',
      {
        stepType: '1',
        scope: 'config',
        propertyKey: '1',
      },
      null
    );
    expect(validationResults).toHaveLength(1);
    expect(validationResults[0]).toMatchObject({
      id: '1',
      severity: 'error',
      message: 'Error',
      hoverMessage: 'Error\n\n[Link](/link)',
      beforeMessage: undefined,
      afterMessage: null,
    });
  });

  it('should return valid result when resolve returns option and getDetails returns valid message', async () => {
    const resolvedOption = {
      value: '2',
      label: 'Option 2',
      description: 'Description 2',
    };
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn().mockResolvedValue(resolvedOption),
      getDetails: jest.fn().mockResolvedValue({
        message: 'Valid',
      }),
    };

    const mockConnector = {
      type: '2',
      paramsSchema: z.object({ '2': z.string() }),
    };
    mockGetAllConnectorsMapCache.mockReturnValue(new Map([['2', mockConnector as any]]));
    mockGetSchemaAtPath.mockReturnValue({ schema: z.string(), scopedToPath: '2' });

    const customPropertyItems: CustomPropertyItem[] = [
      {
        id: '2',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        yamlPath: ['2'],
        key: '2',
        selectionHandler,
        context: {
          stepType: '2',
          scope: 'input',
          propertyKey: '2',
        },
        propertyValue: '2',
        propertyKey: '2',
        stepType: '2',
        scope: 'input',
        type: 'custom-property',
      },
    ];

    const validationResults = await validateCustomProperties(customPropertyItems);

    expect(selectionHandler.resolve).toHaveBeenCalledWith('2', {
      stepType: '2',
      scope: 'input',
      propertyKey: '2',
    });
    expect(selectionHandler.getDetails).toHaveBeenCalledWith(
      '2',
      {
        stepType: '2',
        scope: 'input',
        propertyKey: '2',
      },
      resolvedOption
    );
    expect(validationResults).toHaveLength(1);
    expect(validationResults[0]).toMatchObject({
      id: '2',
      severity: null,
      message: null,
      beforeMessage: '✓ Option 2',
      afterMessage: null,
      hoverMessage: 'Valid',
    });
    expect(mockSetCachedOption).toHaveBeenCalledWith('2:input:2:2', resolvedOption);
  });

  it('should use cached option when available', async () => {
    const cachedOption = {
      value: '3',
      label: 'Cached Option',
      description: 'Cached Description',
    };
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn().mockResolvedValue({
        message: 'Valid',
      }),
    };

    mockGetCachedOption.mockReturnValue(cachedOption);

    const mockConnector = {
      type: '3',
      configSchema: z.object({ '3': z.string() }),
    };
    mockGetAllConnectorsMapCache.mockReturnValue(new Map([['3', mockConnector as any]]));
    mockGetSchemaAtPath.mockReturnValue({ schema: z.string(), scopedToPath: '3' });

    const customPropertyItems: CustomPropertyItem[] = [
      {
        id: '3',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        yamlPath: ['3'],
        key: '3',
        selectionHandler,
        context: {
          stepType: '3',
          scope: 'config',
          propertyKey: '3',
        },
        propertyValue: '3',
        propertyKey: '3',
        stepType: '3',
        scope: 'config',
        type: 'custom-property',
      },
    ];

    const validationResults = await validateCustomProperties(customPropertyItems);

    expect(selectionHandler.resolve).not.toHaveBeenCalled();
    expect(selectionHandler.getDetails).toHaveBeenCalledWith(
      '3',
      {
        stepType: '3',
        scope: 'config',
        propertyKey: '3',
      },
      cachedOption
    );
    expect(validationResults).toHaveLength(1);
    expect(validationResults[0]).toMatchObject({
      id: '3',
      severity: null,
      message: null,
      beforeMessage: '✓ Cached Option',
      afterMessage: null,
    });
  });

  it('should use cached search option when available', async () => {
    const cachedSearchOption = {
      value: '4',
      label: 'Search Option',
      description: 'Search Description',
    };
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn().mockResolvedValue({
        message: 'Valid',
      }),
    };

    mockGetCachedSearchOption.mockReturnValue(cachedSearchOption);

    const mockConnector = {
      type: '4',
      paramsSchema: z.object({ '4': z.string() }),
    };
    mockGetAllConnectorsMapCache.mockReturnValue(new Map([['4', mockConnector as any]]));
    mockGetSchemaAtPath.mockReturnValue({ schema: z.string(), scopedToPath: '4' });

    const customPropertyItems: CustomPropertyItem[] = [
      {
        id: '4',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        yamlPath: ['4'],
        key: '4',
        selectionHandler,
        context: {
          stepType: '4',
          scope: 'input',
          propertyKey: '4',
        },
        propertyValue: '4',
        propertyKey: '4',
        stepType: '4',
        scope: 'input',
        type: 'custom-property',
      },
    ];

    const validationResults = await validateCustomProperties(customPropertyItems);

    expect(selectionHandler.resolve).not.toHaveBeenCalled();
    expect(selectionHandler.getDetails).toHaveBeenCalledWith(
      '4',
      {
        stepType: '4',
        scope: 'input',
        propertyKey: '4',
      },
      cachedSearchOption
    );
    expect(validationResults).toHaveLength(1);
    expect(validationResults[0]).toMatchObject({
      id: '4',
      severity: null,
      message: null,
      beforeMessage: '✓ Search Option',
      afterMessage: null,
    });
  });

  it('should skip validation when schema validation fails', async () => {
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn(),
    };

    const mockConnector = {
      type: '5',
      configSchema: z.object({ '5': z.number() }), // Expects number, but we'll pass string
    };
    mockGetAllConnectorsMapCache.mockReturnValue(new Map([['5', mockConnector as any]]));
    mockGetSchemaAtPath.mockReturnValue({ schema: z.number(), scopedToPath: '5' });

    const customPropertyItems: CustomPropertyItem[] = [
      {
        id: '5',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        yamlPath: ['5'],
        key: '5',
        selectionHandler,
        context: {
          stepType: '5',
          scope: 'config',
          propertyKey: '5',
        },
        propertyValue: 'invalid', // String instead of number
        propertyKey: '5',
        stepType: '5',
        scope: 'config',
        type: 'custom-property',
      },
    ];

    const validationResults = await validateCustomProperties(customPropertyItems);

    expect(selectionHandler.resolve).not.toHaveBeenCalled();
    expect(selectionHandler.getDetails).not.toHaveBeenCalled();
    expect(validationResults).toHaveLength(0);
  });

  it('should skip validation when connector is not found', async () => {
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn(),
    };

    mockGetAllConnectorsMapCache.mockReturnValue(new Map());

    const customPropertyItems: CustomPropertyItem[] = [
      {
        id: '6',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        yamlPath: ['6'],
        key: '6',
        selectionHandler,
        context: {
          stepType: '6',
          scope: 'config',
          propertyKey: '6',
        },
        propertyValue: '6',
        propertyKey: '6',
        stepType: '6',
        scope: 'config',
        type: 'custom-property',
      },
    ];

    const validationResults = await validateCustomProperties(customPropertyItems);

    expect(selectionHandler.resolve).not.toHaveBeenCalled();
    expect(selectionHandler.getDetails).not.toHaveBeenCalled();
    expect(validationResults).toHaveLength(0);
  });

  it('should handle multiple custom properties with different outcomes', async () => {
    const selectionHandler1 = {
      search: jest.fn(),
      resolve: jest.fn().mockResolvedValue(null),
      getDetails: jest.fn().mockResolvedValue({
        message: 'Error',
        links: [{ text: 'Link', path: '/link' }],
      }),
    };
    const selectionHandler2 = {
      search: jest.fn(),
      resolve: jest.fn().mockResolvedValue({
        value: '2',
        label: 'Option 2',
        description: 'Description 2',
      }),
      getDetails: jest.fn().mockResolvedValue({
        message: 'Valid',
      }),
    };

    const mockConnector1 = {
      type: '1',
      configSchema: z.object({ '1': z.string() }),
    };
    const mockConnector2 = {
      type: '2',
      paramsSchema: z.object({ '2': z.string() }),
    };
    mockGetAllConnectorsMapCache.mockReturnValue(
      new Map([
        ['1', mockConnector1 as any],
        ['2', mockConnector2 as any],
      ])
    );
    mockGetSchemaAtPath
      .mockReturnValueOnce({ schema: z.string(), scopedToPath: '1' })
      .mockReturnValueOnce({ schema: z.string(), scopedToPath: '2' });

    const customPropertyItems: CustomPropertyItem[] = [
      {
        id: '1',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        yamlPath: ['1'],
        key: '1',
        selectionHandler: selectionHandler1,
        context: {
          stepType: '1',
          scope: 'config',
          propertyKey: '1',
        },
        propertyValue: '1',
        propertyKey: '1',
        stepType: '1',
        scope: 'config',
        type: 'custom-property',
      },
      {
        id: '2',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        yamlPath: ['2'],
        key: '2',
        selectionHandler: selectionHandler2,
        context: {
          stepType: '2',
          scope: 'input',
          propertyKey: '2',
        },
        propertyValue: '2',
        propertyKey: '2',
        stepType: '2',
        scope: 'input',
        type: 'custom-property',
      },
    ];

    const validationResults = await validateCustomProperties(customPropertyItems);

    expect(validationResults).toHaveLength(2);
    expect(validationResults[0]).toMatchObject({
      id: '1',
      severity: 'error',
      message: 'Error',
      hoverMessage: 'Error\n\n[Link](/link)',
    });
    expect(validationResults[1]).toMatchObject({
      id: '2',
      severity: null,
      message: null,
      beforeMessage: '✓ Option 2',
      afterMessage: null,
      hoverMessage: 'Valid',
    });
  });
});
