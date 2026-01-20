/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateCustomProperties } from './validate_custom_properties';
import type { CustomPropertyItem } from '../model/types';

describe('validateCustomProperties', () => {
  it('should use the selection handler to validate the custom properties', async () => {
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
    expect(selectionHandler1.resolve).toHaveBeenCalledWith('1', {
      stepType: '1',
      scope: 'config',
      propertyKey: '1',
    });
    expect(selectionHandler1.getDetails).toHaveBeenCalledWith(
      '1',
      {
        stepType: '1',
        scope: 'config',
        propertyKey: '1',
      },
      null
    );
    expect(selectionHandler2.resolve).toHaveBeenCalledWith('2', {
      stepType: '2',
      scope: 'input',
      propertyKey: '2',
    });
    expect(selectionHandler2.getDetails).toHaveBeenCalledWith(
      '2',
      {
        stepType: '2',
        scope: 'input',
        propertyKey: '2',
      },
      {
        value: '2',
        label: 'Option 2',
        description: 'Description 2',
      }
    );
    expect(validationResults).toHaveLength(2);
    expect(validationResults[0]).toMatchObject({
      id: '1',
      severity: 'error',
      message: 'Error',
      hoverMessage: '[Link](/link)',
    });
    expect(validationResults[1]).toMatchObject({
      id: '2',
      severity: null,
      message: null,
      afterMessage: 'Valid',
    });
  });
});
