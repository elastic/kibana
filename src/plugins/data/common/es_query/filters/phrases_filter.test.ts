/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { buildPhrasesFilter, getPhrasesFilterField } from './phrases_filter';
import { IIndexPattern } from '../../index_patterns';
import { fields } from '../../index_patterns/fields/fields.mocks';

describe('phrases filter', function () {
  const indexPattern: IIndexPattern = ({
    fields,
  } as unknown) as IIndexPattern;

  describe('getPhrasesFilterField', function () {
    it('should return the name of the field a phrases query is targeting', () => {
      const field = indexPattern.fields.find((patternField) => patternField.name === 'extension');
      const filter = buildPhrasesFilter(field!, ['jpg', 'png'], indexPattern);
      const result = getPhrasesFilterField(filter);
      expect(result).toBe('extension');
    });
  });
});
