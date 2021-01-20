/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { generateFilters } from './generate_filters';
import { FilterManager } from '../filter_manager';

import {
  Filter,
  IFieldType,
  IIndexPattern,
  isExistsFilter,
  buildExistsFilter,
  PhraseFilter,
  isPhraseFilter,
} from '../../../../common';

const INDEX_NAME = 'my-index';
const EXISTS_FIELD_NAME = '_exists_';
const FIELD = {
  name: 'my-field',
} as IFieldType;
const PHRASE_VALUE = 'my-value';

describe('Generate filters', () => {
  let mockFilterManager: FilterManager;
  let filtersArray: Filter[];

  beforeEach(() => {
    filtersArray = [];
    mockFilterManager = {
      getAppFilters: () => {
        return filtersArray;
      },
    } as FilterManager;
  });

  it('should create exists filter', () => {
    const filters = generateFilters(
      mockFilterManager,
      EXISTS_FIELD_NAME,
      FIELD.name,
      '',
      INDEX_NAME
    );
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeFalsy();
    expect(isExistsFilter(filters[0])).toBeTruthy();
  });

  it('should create negated exists filter', () => {
    const filters = generateFilters(
      mockFilterManager,
      EXISTS_FIELD_NAME,
      FIELD.name,
      '-',
      INDEX_NAME
    );
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeTruthy();
    expect(isExistsFilter(filters[0])).toBeTruthy();
  });

  it('should update and re-enable EXISTING exists filter', () => {
    const filter = buildExistsFilter(FIELD, { id: INDEX_NAME } as IIndexPattern);
    filter.meta.disabled = true;
    filtersArray.push(filter);

    const filters = generateFilters(mockFilterManager, '_exists_', FIELD.name, '-', INDEX_NAME);
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeTruthy();
    expect(filters[0].meta.disabled).toBeFalsy();
    expect(isExistsFilter(filters[0])).toBeTruthy();
  });

  it('should create phrase filter', () => {
    const filters = generateFilters(mockFilterManager, FIELD, PHRASE_VALUE, '', INDEX_NAME);
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeFalsy();
    expect(isPhraseFilter(filters[0])).toBeTruthy();
    expect((filters[0] as PhraseFilter).query.match_phrase).toEqual({
      [FIELD.name]: PHRASE_VALUE,
    });
  });

  it('should create negated phrase filter', () => {
    const filters = generateFilters(mockFilterManager, FIELD, PHRASE_VALUE, '-', INDEX_NAME);
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeTruthy();
    expect(isPhraseFilter(filters[0])).toBeTruthy();
    expect((filters[0] as PhraseFilter).query.match_phrase).toEqual({
      [FIELD.name]: PHRASE_VALUE,
    });
  });

  it('should create multiple phrase filters', () => {
    const ANOTHER_PHRASE = 'another-value';
    const filters = generateFilters(
      mockFilterManager,
      FIELD,
      [PHRASE_VALUE, ANOTHER_PHRASE],
      '',
      INDEX_NAME
    );
    expect(filters).toHaveLength(2);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeFalsy();
    expect(filters[1].meta.index === INDEX_NAME);
    expect(filters[1].meta.negate).toBeFalsy();
    expect(isPhraseFilter(filters[0])).toBeTruthy();
    expect(isPhraseFilter(filters[1])).toBeTruthy();
    expect((filters[0] as PhraseFilter).query.match_phrase).toEqual({
      [FIELD.name]: PHRASE_VALUE,
    });
    expect((filters[1] as PhraseFilter).query.match_phrase).toEqual({
      [FIELD.name]: ANOTHER_PHRASE,
    });
  });
});
