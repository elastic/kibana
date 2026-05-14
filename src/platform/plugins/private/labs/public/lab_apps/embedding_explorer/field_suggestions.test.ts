/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSuggestedField, getSuggestedProjectionField } from './field_suggestions';

describe('field suggestions', () => {
  describe('getSuggestedProjectionField', () => {
    it('prefers projection-style fields', () => {
      expect(
        getSuggestedProjectionField(['length', 'score', 'projection.x', 'projection.y'], 'x')
      ).toBe('projection.x');
      expect(
        getSuggestedProjectionField(['length', 'score', 'projection.x', 'projection.y'], 'y')
      ).toBe('projection.y');
    });

    it('returns an empty suggestion when no projection-like fields exist', () => {
      expect(getSuggestedProjectionField(['length', 'score', 'created_at'], 'x')).toBe('');
      expect(getSuggestedProjectionField(['length', 'score', 'created_at'], 'y')).toBe('');
    });
  });

  describe('getSuggestedField', () => {
    it('prefers candidate matches before falling back to the first field', () => {
      expect(getSuggestedField(['title', 'summary', 'message'], ['summary', 'label'])).toBe(
        'summary'
      );
      expect(getSuggestedField(['title', 'name'], ['summary', 'label'])).toBe('title');
      expect(getSuggestedField([], ['summary', 'label'])).toBe('');
    });
  });
});
