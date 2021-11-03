/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { handleNestedFilter } from './handle_nested_filter';
import { fields } from '../filters/stubs';
import { buildPhraseFilter, buildQueryFilter } from '../filters';
import { DataViewBase } from './types';

describe('handleNestedFilter', function () {
  const indexPattern: DataViewBase = {
    id: 'logstash-*',
    fields,
    title: 'dataView',
  };

  it("should return the filter's query wrapped in nested query if the target field is nested", () => {
    const field = getField('nestedField.child');
    const filter = buildPhraseFilter(field!, 'foo', indexPattern);
    const result = handleNestedFilter(filter, indexPattern);
    expect(result).toEqual({
      meta: {
        index: 'logstash-*',
      },
      query: {
        nested: {
          path: 'nestedField',
          query: {
            match_phrase: {
              'nestedField.child': 'foo',
            },
          },
        },
      },
    });
  });

  it('should return filter untouched if it does not target a nested field', () => {
    const field = getField('extension');
    const filter = buildPhraseFilter(field!, 'jpg', indexPattern);
    const result = handleNestedFilter(filter, indexPattern);
    expect(result).toBe(filter);
  });

  it('should return filter untouched if it does not target a field from the given index pattern', () => {
    const field = getField('extension');
    const unrealField = {
      ...field!,
      name: 'notarealfield',
    };
    const filter = buildPhraseFilter(unrealField, 'jpg', indexPattern);
    const result = handleNestedFilter(filter, indexPattern);
    expect(result).toBe(filter);
  });

  it('should return filter untouched if no index pattern is provided', () => {
    const field = getField('extension');
    const filter = buildPhraseFilter(field!, 'jpg', indexPattern);
    const result = handleNestedFilter(filter);
    expect(result).toBe(filter);
  });

  it('should return the filter untouched if a target field cannot be determined', () => {
    // for example, we don't support query_string queries
    const filter = buildQueryFilter(
      {
        query_string: {
          query: 'response:200',
        },
      },
      'logstash-*',
      'foo'
    );
    const result = handleNestedFilter(filter);
    expect(result).toBe(filter);
  });

  function getField(name: string) {
    return indexPattern.fields.find((field) => field.name === name);
  }
});
