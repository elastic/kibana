/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepSelectionValues } from '@kbn/workflows';
import { getSchemaAtPath } from '@kbn/workflows/common/utils/zod/get_schema_at_path';
import { z } from '@kbn/zod/v4';

import {
  clearStepPropertyValidationOutcomeCache,
  validateStepProperties,
} from './validate_step_properties';
import { stepSchemas } from '../../../../common/step_schemas';
import * as stepPropertySelectionCache from '../../../shared/lib/step_property_selection_cache';
import type { StepPropertyItem } from '../model/types';

// Mock the dependencies
jest.mock('../../../../common/step_schemas', () => ({
  stepSchemas: {
    getAllConnectorsMapCache: jest.fn(),
  },
}));

jest.mock('@kbn/workflows/common/utils/zod/get_schema_at_path', () => ({
  getSchemaAtPath: jest.fn(),
}));

jest.mock('../../../shared/lib/step_property_selection_cache', () => {
  const actual = jest.requireActual<
    typeof import('../../../shared/lib/step_property_selection_cache')
  >('../../../shared/lib/step_property_selection_cache');
  return {
    ...actual,
    getCachedSearchOption: jest.fn(actual.getCachedSearchOption),
  };
});

const EMPTY_VALUES: StepSelectionValues = { config: {}, input: {} };

const mockGetAllConnectorsMapCache = stepSchemas.getAllConnectorsMapCache as jest.MockedFunction<
  typeof stepSchemas.getAllConnectorsMapCache
>;
const mockGetSchemaAtPath = getSchemaAtPath as jest.MockedFunction<typeof getSchemaAtPath>;
const mockGetCachedSearchOption =
  stepPropertySelectionCache.getCachedSearchOption as jest.MockedFunction<
    typeof stepPropertySelectionCache.getCachedSearchOption
  >;

describe('validateStepProperties', () => {
  beforeEach(() => {
    clearStepPropertyValidationOutcomeCache();
    jest.clearAllMocks();
    const actual = jest.requireActual<
      typeof import('../../../shared/lib/step_property_selection_cache')
    >('../../../shared/lib/step_property_selection_cache');
    mockGetCachedSearchOption.mockImplementation(actual.getCachedSearchOption);
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

    const customPropertyItems: StepPropertyItem[] = [
      {
        id: '1',
        stepId: 'step-1',
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
          values: EMPTY_VALUES,
        },
        propertyValue: '1',
        propertyKey: '1',
        stepType: '1',
        scope: 'config',
        type: 'step-property',
      },
    ];

    const validationResults = await validateStepProperties(customPropertyItems);

    expect(selectionHandler.resolve).toHaveBeenCalledWith('1', {
      stepType: '1',
      scope: 'config',
      propertyKey: '1',
      values: EMPTY_VALUES,
    });
    expect(selectionHandler.getDetails).toHaveBeenCalledWith(
      '1',
      {
        stepType: '1',
        scope: 'config',
        propertyKey: '1',
        values: EMPTY_VALUES,
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

    const customPropertyItems: StepPropertyItem[] = [
      {
        id: '2',
        stepId: 'step-2',
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
          values: EMPTY_VALUES,
        },
        propertyValue: '2',
        propertyKey: '2',
        stepType: '2',
        scope: 'input',
        type: 'step-property',
      },
    ];

    const validationResults = await validateStepProperties(customPropertyItems);

    expect(selectionHandler.resolve).toHaveBeenCalledWith('2', {
      stepType: '2',
      scope: 'input',
      propertyKey: '2',
      values: EMPTY_VALUES,
    });
    expect(selectionHandler.getDetails).toHaveBeenCalledWith(
      '2',
      {
        stepType: '2',
        scope: 'input',
        propertyKey: '2',
        values: EMPTY_VALUES,
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
  });

  it('should use cached search option when available (resolve skipped)', async () => {
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

    mockGetCachedSearchOption.mockReturnValue(cachedOption);

    const mockConnector = {
      type: '3',
      configSchema: z.object({ '3': z.string() }),
    };
    mockGetAllConnectorsMapCache.mockReturnValue(new Map([['3', mockConnector as any]]));
    mockGetSchemaAtPath.mockReturnValue({ schema: z.string(), scopedToPath: '3' });

    const customPropertyItems: StepPropertyItem[] = [
      {
        id: '3',
        stepId: 'step-3',
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
          values: EMPTY_VALUES,
        },
        propertyValue: '3',
        propertyKey: '3',
        stepType: '3',
        scope: 'config',
        type: 'step-property',
      },
    ];

    const validationResults = await validateStepProperties(customPropertyItems);

    expect(selectionHandler.resolve).not.toHaveBeenCalled();
    expect(selectionHandler.getDetails).toHaveBeenCalledWith(
      '3',
      {
        stepType: '3',
        scope: 'config',
        propertyKey: '3',
        values: EMPTY_VALUES,
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

    const customPropertyItems: StepPropertyItem[] = [
      {
        id: '5',
        stepId: 'step-5',
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
          values: EMPTY_VALUES,
        },
        propertyValue: 'invalid', // String instead of number
        propertyKey: '5',
        stepType: '5',
        scope: 'config',
        type: 'step-property',
      },
    ];

    const validationResults = await validateStepProperties(customPropertyItems);

    expect(selectionHandler.resolve).not.toHaveBeenCalled();
    expect(selectionHandler.getDetails).not.toHaveBeenCalled();
    expect(validationResults).toHaveLength(0);
  });

  it('should skip selection validation for Liquid template values and not call resolve or getDetails', async () => {
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn(),
      getDetails: jest.fn(),
    };

    const mockConnector = {
      type: '6a',
      configSchema: z.object({ prop: z.string() }),
    };
    mockGetAllConnectorsMapCache.mockReturnValue(new Map([['6a', mockConnector as any]]));
    mockGetSchemaAtPath.mockReturnValue({ schema: z.string(), scopedToPath: 'prop' });

    const customPropertyItems: StepPropertyItem[] = [
      {
        id: '6a',
        stepId: 'step-6a',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        yamlPath: ['6a'],
        key: 'prop',
        selectionHandler,
        context: {
          stepType: '6a',
          scope: 'config',
          propertyKey: 'prop',
          values: EMPTY_VALUES,
        },
        propertyValue: '{{ inputs.something }}',
        propertyKey: 'prop',
        stepType: '6a',
        scope: 'config',
        type: 'step-property',
      },
    ];

    const validationResults = await validateStepProperties(customPropertyItems);

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

    const customPropertyItems: StepPropertyItem[] = [
      {
        id: '6',
        stepId: 'step-6',
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
          values: EMPTY_VALUES,
        },
        propertyValue: '6',
        propertyKey: '6',
        stepType: '6',
        scope: 'config',
        type: 'step-property',
      },
    ];

    const validationResults = await validateStepProperties(customPropertyItems);

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

    const customPropertyItems: StepPropertyItem[] = [
      {
        id: '1',
        stepId: 'multi-step-a',
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
          values: EMPTY_VALUES,
        },
        propertyValue: '1',
        propertyKey: '1',
        stepType: '1',
        scope: 'config',
        type: 'step-property',
      },
      {
        id: '2',
        stepId: 'multi-step-b',
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
          values: EMPTY_VALUES,
        },
        propertyValue: '2',
        propertyKey: '2',
        stepType: '2',
        scope: 'input',
        type: 'step-property',
      },
    ];

    const validationResults = await validateStepProperties(customPropertyItems);

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

  it('should skip resolve and getDetails on a second validation when semantic inputs are unchanged', async () => {
    const selectionHandler = {
      search: jest.fn(),
      resolve: jest.fn().mockResolvedValue(null),
      getDetails: jest.fn().mockResolvedValue({
        message: 'Unresolved',
      }),
    };

    const mockConnector = {
      type: 'cache-test',
      configSchema: z.object({ field: z.string() }),
    };
    mockGetAllConnectorsMapCache.mockReturnValue(new Map([['cache-test', mockConnector as any]]));
    mockGetSchemaAtPath.mockReturnValue({ schema: z.string(), scopedToPath: 'field' });

    const item: StepPropertyItem = {
      id: 'cache-test-item',
      stepId: 'cache-step',
      startLineNumber: 2,
      startColumn: 1,
      endLineNumber: 2,
      endColumn: 5,
      yamlPath: ['field'],
      key: 'field',
      selectionHandler,
      context: {
        stepType: 'cache-test',
        scope: 'config',
        propertyKey: 'field',
        values: EMPTY_VALUES,
      },
      propertyValue: 'missing-id',
      propertyKey: 'field',
      stepType: 'cache-test',
      scope: 'config',
      type: 'step-property',
    };

    await validateStepProperties([item]);
    await validateStepProperties([item]);

    expect(selectionHandler.resolve).toHaveBeenCalledTimes(1);
    expect(selectionHandler.getDetails).toHaveBeenCalledTimes(1);
  });
});
