/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { generateFilters } from './generate_filters';
import { FilterManager } from '../filter_manager';

import { esFilters, IFieldType, IIndexPattern } from '../../../../common';

const INDEX_NAME = 'my-index';
const EXISTS_FIELD_NAME = '_exists_';
const FIELD = {
  name: 'my-field',
} as IFieldType;
const PHRASE_VALUE = 'my-value';

describe('Generate filters', () => {
  let mockFilterManager: FilterManager;
  let filtersArray: esFilters.Filter[];

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
    expect(esFilters.isExistsFilter(filters[0])).toBeTruthy();
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
    expect(esFilters.isExistsFilter(filters[0])).toBeTruthy();
  });

  it('should update and re-enable EXISTING exists filter', () => {
    const filter = esFilters.buildExistsFilter(FIELD, { id: INDEX_NAME } as IIndexPattern);
    filter.meta.disabled = true;
    filtersArray.push(filter);

    const filters = generateFilters(mockFilterManager, '_exists_', FIELD.name, '-', INDEX_NAME);
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeTruthy();
    expect(filters[0].meta.disabled).toBeFalsy();
    expect(esFilters.isExistsFilter(filters[0])).toBeTruthy();
  });

  it('should create phrase filter', () => {
    const filters = generateFilters(mockFilterManager, FIELD, PHRASE_VALUE, '', INDEX_NAME);
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeFalsy();
    expect(esFilters.isPhraseFilter(filters[0])).toBeTruthy();
    expect((filters[0] as esFilters.PhraseFilter).query.match_phrase).toEqual({
      [FIELD.name]: PHRASE_VALUE,
    });
  });

  it('should create negated phrase filter', () => {
    const filters = generateFilters(mockFilterManager, FIELD, PHRASE_VALUE, '-', INDEX_NAME);
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeTruthy();
    expect(esFilters.isPhraseFilter(filters[0])).toBeTruthy();
    expect((filters[0] as esFilters.PhraseFilter).query.match_phrase).toEqual({
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
    expect(esFilters.isPhraseFilter(filters[0])).toBeTruthy();
    expect(esFilters.isPhraseFilter(filters[1])).toBeTruthy();
    expect((filters[0] as esFilters.PhraseFilter).query.match_phrase).toEqual({
      [FIELD.name]: PHRASE_VALUE,
    });
    expect((filters[1] as esFilters.PhraseFilter).query.match_phrase).toEqual({
      [FIELD.name]: ANOTHER_PHRASE,
    });
  });
});
