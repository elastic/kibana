/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { handleNestedFilter } from './handle_nested_filter';
import { fields } from '../../index_patterns/mocks';
import { buildPhraseFilter, buildQueryFilter } from '../filters';
import { IFieldType, IIndexPattern } from '../../index_patterns';

describe('handleNestedFilter', function () {
  const indexPattern: IIndexPattern = ({
    id: 'logstash-*',
    fields,
  } as unknown) as IIndexPattern;

  it("should return the filter's query wrapped in nested query if the target field is nested", () => {
    const field = getField('nestedField.child');
    const filter = buildPhraseFilter(field!, 'foo', indexPattern);
    const result = handleNestedFilter(filter, indexPattern);
    expect(result).toEqual({
      meta: {
        index: 'logstash-*',
      },
      nested: {
        path: 'nestedField',
        query: {
          match_phrase: {
            'nestedField.child': 'foo',
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
    const field = { ...getField('extension'), name: 'notarealfield' };
    const filter = buildPhraseFilter(field as IFieldType, 'jpg', indexPattern);
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
        query: {
          query_string: {
            query: 'response:200',
          },
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
