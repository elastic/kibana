/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inlineCastsMapping } from '../../../../generated/inline_casts_mapping';
import { getCastingTypesSuggestions } from './after_cast';

describe('Suggest after cast', () => {
  describe('getCastingTypesSuggestions', () => {
    it('should return all type casts if no typeBeingCasted is provided', () => {
      const suggestions = getCastingTypesSuggestions();
      const suggestionsLabels = suggestions.map((s) => s.label);

      expect(suggestionsLabels).toEqual(Object.keys(inlineCastsMapping));
    });

    it('should not return the same type as typeBeingCasted', () => {
      const suggestions = getCastingTypesSuggestions('integer');
      const suggestionsLabels = suggestions.map((s) => s.label);

      expect(suggestionsLabels).not.toContain('integer');
    });

    it('should return only valid type casts for the provided typeBeingCasted', () => {
      const suggestions = getCastingTypesSuggestions('boolean');
      const suggestionsLabels = suggestions.map((s) => s.label);

      expect(suggestionsLabels).toEqual([
        'double',
        'int',
        'integer',
        'keyword',
        'long',
        'string',
        'unsigned_long',
      ]);
    });
  });
});
