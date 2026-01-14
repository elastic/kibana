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
  it('should use the validator function to validate the custom properties', async () => {
    const validator1 = jest.fn().mockResolvedValue({
      severity: 'error',
      message: 'Error',
      hoverMessage: 'Hover message',
    });
    const validator2 = jest.fn().mockResolvedValue({
      severity: null,
      message: null,
      afterMessage: 'Valid',
    });
    const customPropertyItems: CustomPropertyItem[] = [
      {
        id: '1',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        yamlPath: ['1'],
        key: '1',
        validator: validator1,
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
        validator: validator2,
        propertyValue: '2',
        propertyKey: '2',
        stepType: '2',
        scope: 'input',
        type: 'custom-property',
      },
    ];
    const validationResults = await validateCustomProperties(customPropertyItems);
    expect(validator1).toHaveBeenCalledWith('1', {
      stepType: '1',
      scope: 'config',
      propertyKey: '1',
    });
    expect(validator2).toHaveBeenCalledWith('2', {
      stepType: '2',
      scope: 'input',
      propertyKey: '2',
    });
    expect(validationResults).toHaveLength(2);
    expect(validationResults[0]).toMatchObject({
      id: '1',
      severity: 'error',
      message: 'Error',
      hoverMessage: 'Hover message',
    });
    expect(validationResults[1]).toMatchObject({
      id: '2',
      severity: null,
      message: null,
      afterMessage: 'Valid',
    });
  });
});
