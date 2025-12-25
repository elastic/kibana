/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter, Scalar } from 'yaml';
import { YAMLMap } from 'yaml';
import {
  getCustomPropertySuggestions,
  type GetCustomPropertySuggestionsContext,
} from './get_custom_property_suggestions';

describe('getCustomPropertySuggestions', () => {
  it('should return suggestions for custom properties', async () => {
    const context: GetCustomPropertySuggestionsContext = {
      focusedStepInfo: {
        stepId: '1',
        stepYamlNode: new YAMLMap(),
        lineStart: 1,
        lineEnd: 1,
        stepType: 'custom-type',
        propInfos: {},
      },
      focusedYamlPair: {
        keyNode: { value: 'custom-id', range: [1, 1, 1] } as Scalar,
        valueNode: { value: '', range: [1, 1, 1] } as Scalar,
        path: ['custom-id'],
      },
      yamlLineCounter: {
        linePos: jest.fn().mockReturnValue({ line: 1, col: 1 }),
      } as unknown as LineCounter,
    };
    const getPropertyHandler = jest
      .fn()
      .mockImplementation((stepType: string, scope: 'config' | 'input', key: string) => {
        if (stepType === 'custom-type' && scope === 'config' && key === 'custom-id') {
          return {
            complete: jest.fn().mockReturnValue([
              { label: 'custom-label', value: 'custom-value' },
              { label: 'custom-label-2', value: 'custom-value-2' },
            ]),
          };
        }
        return null;
      });
    const suggestions = await getCustomPropertySuggestions(context, getPropertyHandler);
    expect(suggestions).toHaveLength(2);
    expect(suggestions.map((s) => s.label)).toEqual(['custom-label', 'custom-label-2']);
  });
});
