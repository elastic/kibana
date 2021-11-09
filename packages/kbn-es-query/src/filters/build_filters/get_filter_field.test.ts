/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildPhraseFilter } from './phrase_filter';
import { buildQueryFilter } from './query_string_filter';
import { getFilterField } from './get_filter_field';
import { DataViewBase } from '../../es_query';
import { fields } from '../stubs/fields.mocks';

describe('getFilterField', function () {
  const indexPattern: DataViewBase = {
    id: 'logstash-*',
    fields,
    title: 'dataView',
  };

  it('should return the field name from known filter types that target a specific field', () => {
    const field = indexPattern.fields.find((patternField) => patternField.name === 'extension');
    const filter = buildPhraseFilter(field!, 'jpg', indexPattern);
    const result = getFilterField(filter);
    expect(result).toBe('extension');
  });

  it('should return undefined for filters that do not target a specific field', () => {
    const filter = buildQueryFilter(
      {
        query_string: {
          query: 'response:200 and extension:jpg',
        },
      },
      indexPattern.id!,
      ''
    );
    const result = getFilterField(filter);
    expect(result).toBe(undefined);
  });
});
