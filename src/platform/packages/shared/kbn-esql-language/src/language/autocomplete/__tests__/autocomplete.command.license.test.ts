/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';
import { getCallbackMocks } from '../../../__tests__/language/helpers';

export function getLicenseMock(level: string) {
  return {
    hasAtLeast: (requiredLevel: string) => level === requiredLevel,
  };
}

describe('autocomplete.suggest', () => {
  describe('license-based command suggestions', () => {
    test('should suggest change_point command with platinum license', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a | /', {
        callbacks: {
          ...getCallbackMocks(),
          getLicense: async () => getLicenseMock('platinum'),
          getActiveProduct: () => ({ type: 'observability', tier: 'complete' }),
        },
      });

      const changePointSuggestion = suggestions.find((s) => s.text === 'CHANGE_POINT ');
      expect(changePointSuggestion).toBeDefined();
    });

    test('should not suggest change_point command with basic license', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a | /', {
        callbacks: {
          ...getCallbackMocks(),
          getLicense: async () => getLicenseMock('basic'),
          getActiveProduct: () => ({ type: 'observability', tier: 'complete' }),
        },
      });

      const changePointSuggestion = suggestions.find((s) => s.text === 'CHANGE_POINT ');
      expect(changePointSuggestion).toBeUndefined();
    });
  });
});
