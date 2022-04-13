/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewBase } from '../../es_query';
import { buildExistsFilter, getExistsFilterField } from './exists_filter';
import { fields } from '../stubs/fields.mocks';

describe('exists filter', function () {
  const indexPattern: DataViewBase = {
    fields,
    title: 'dataView',
  };

  describe('getExistsFilterField', function () {
    it('should return the name of the field an exists query is targeting', () => {
      const field = indexPattern.fields.find((patternField) => patternField.name === 'extension');
      const filter = buildExistsFilter(field!, indexPattern);
      const result = getExistsFilterField(filter);
      expect(result).toBe('extension');
    });
  });
});
