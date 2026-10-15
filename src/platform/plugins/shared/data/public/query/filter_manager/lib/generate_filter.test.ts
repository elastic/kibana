/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateFilters } from './generate_filters';
import type { FilterManager } from '../filter_manager';

import type {
  Filter,
  DataViewFieldBase,
  DataViewBase,
  RangeFilter,
  PhraseFilter,
} from '@kbn/es-query';
import type { CombinedFilter } from '@kbn/es-query';
import {
  isExistsFilter,
  buildExistsFilter,
  isPhraseFilter,
  isRangeFilter,
  isCombinedFilter,
  BooleanRelation,
} from '@kbn/es-query';

const INDEX_NAME = 'my-index';
const MOCKED_INDEX = { id: INDEX_NAME } as unknown as DataViewBase;
const EXISTS_FIELD_NAME = '_exists_';
const FIELD = {
  name: 'my-field',
} as DataViewFieldBase;
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
      MOCKED_INDEX
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
      MOCKED_INDEX
    );
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeTruthy();
    expect(isExistsFilter(filters[0])).toBeTruthy();
  });

  it('should update and re-enable EXISTING exists filter', () => {
    const filter = buildExistsFilter(FIELD, { id: INDEX_NAME } as DataViewBase);
    filter.meta.disabled = true;
    filtersArray.push(filter);

    const filters = generateFilters(mockFilterManager, '_exists_', FIELD.name, '-', MOCKED_INDEX);
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeTruthy();
    expect(filters[0].meta.disabled).toBeFalsy();
    expect(isExistsFilter(filters[0])).toBeTruthy();
  });

  it('should create phrase filter', () => {
    const filters = generateFilters(mockFilterManager, FIELD, PHRASE_VALUE, '', MOCKED_INDEX);
    expect(filters).toHaveLength(1);

    const [filter] = filters as PhraseFilter[];
    expect(filter.meta.index === INDEX_NAME);
    expect(filter.meta.negate).toBeFalsy();
    expect(isPhraseFilter(filter)).toBeTruthy();
    expect(filter.query.match_phrase).toEqual({
      [FIELD.name]: PHRASE_VALUE,
    });
  });

  it('should create negated phrase filter', () => {
    const filters = generateFilters(mockFilterManager, FIELD, PHRASE_VALUE, '-', MOCKED_INDEX);
    expect(filters).toHaveLength(1);
    const [filter] = filters as PhraseFilter[];
    expect(filter.meta.index === INDEX_NAME);
    expect(filter.meta.negate).toBeTruthy();
    expect(isPhraseFilter(filter)).toBeTruthy();
    expect(filter.query.match_phrase).toEqual({
      [FIELD.name]: PHRASE_VALUE,
    });
  });

  it('should create range filter when provided complex range datatype', () => {
    const filters = generateFilters(
      mockFilterManager,
      {
        name: 'my-field',
        type: 'ip_range',
      } as DataViewFieldBase,
      {
        gt: '192.168.0.0',
        lte: '192.168.255.255',
      },
      '+',
      MOCKED_INDEX
    ) as RangeFilter[];
    expect(filters).toHaveLength(1);
    const [filter] = filters;
    expect(filter.meta.index === INDEX_NAME);
    expect(filter.meta.negate).toBeFalsy();
    expect(isRangeFilter(filter)).toBeTruthy();
    expect(filter.query.range).toEqual({
      [FIELD.name]: {
        gt: '192.168.0.0',
        lte: '192.168.255.255',
      },
    });
  });

  it('should create negated range filter when provided complex range datatype', () => {
    const filters = generateFilters(
      mockFilterManager,
      {
        name: 'my-field',
        type: 'ip_range',
      } as DataViewFieldBase,
      {
        gt: '192.168.0.0',
        lte: '192.168.255.255',
      },
      '-',
      MOCKED_INDEX
    ) as RangeFilter[];
    expect(filters).toHaveLength(1);
    const [filter] = filters;
    expect(filter.meta.index === INDEX_NAME);
    expect(filter.meta.negate).toBeTruthy();
    expect(isRangeFilter(filter)).toBeTruthy();
    expect(filter.query.range).toEqual({
      [FIELD.name]: {
        gt: '192.168.0.0',
        lte: '192.168.255.255',
      },
    });
  });

  it('should create a phrase filter on a simple range datatype', () => {
    const filters = generateFilters(
      mockFilterManager,
      {
        name: 'my-field',
        type: 'number_range',
      } as DataViewFieldBase,
      10000,
      '+',
      MOCKED_INDEX
    );

    expect(filters).toHaveLength(1);
    const [filter] = filters;
    expect(filter.meta.index === INDEX_NAME);
    expect(filter.meta.negate).toBeFalsy();
    expect(isPhraseFilter(filter)).toBeTruthy();

    expect(filter.query?.match_phrase).toEqual({
      [FIELD.name]: 10000,
    });
  });

  it('should create multiple phrase filters', () => {
    const ANOTHER_PHRASE = 'another-value';
    const filters = generateFilters(
      mockFilterManager,
      FIELD,
      [PHRASE_VALUE, ANOTHER_PHRASE],
      '',
      MOCKED_INDEX
    );
    expect(filters).toHaveLength(2);
    expect(filters[0].meta.index === INDEX_NAME);
    expect(filters[0].meta.negate).toBeFalsy();
    expect(filters[1].meta.index === INDEX_NAME);
    expect(filters[1].meta.negate).toBeFalsy();
    expect(isPhraseFilter(filters[0])).toBeTruthy();
    expect(isPhraseFilter(filters[1])).toBeTruthy();
    expect(filters[0].query?.match_phrase).toEqual({
      [FIELD.name]: PHRASE_VALUE,
    });
    expect(filters[1].query?.match_phrase).toEqual({
      [FIELD.name]: ANOTHER_PHRASE,
    });
  });

  it('should use only distinct values', () => {
    const ANOTHER_PHRASE = 'another-value';
    const filters = generateFilters(
      mockFilterManager,
      FIELD,
      [PHRASE_VALUE, ANOTHER_PHRASE, PHRASE_VALUE, ANOTHER_PHRASE],
      '',
      MOCKED_INDEX
    );
    expect(filters).toHaveLength(2);
    expect(filters[0].query?.match_phrase).toEqual({
      [FIELD.name]: PHRASE_VALUE,
    });
    expect(filters[1].query?.match_phrase).toEqual({
      [FIELD.name]: ANOTHER_PHRASE,
    });
  });

  it('should genereate a range filter when date type field is provided', () => {
    const filters = generateFilters(
      mockFilterManager,
      {
        ...FIELD,
        type: 'date',
      } as DataViewFieldBase,
      '2022-08-01',
      '+',
      MOCKED_INDEX
    ) as RangeFilter[];
    expect(filters).toHaveLength(1);
    const [filter] = filters;
    expect(filter.meta.index === INDEX_NAME);
    expect(filter.meta.negate).toBeFalsy();
    expect(isRangeFilter(filter)).toBeTruthy();
    expect(filter.query.range).toEqual({
      [FIELD.name]: {
        format: 'date_time',
        gte: expect.stringContaining('2022-08-01'),
        lte: expect.stringContaining('2022-08-01'),
      },
    });
  });

  it('should genereate a range filter when date_nanos type field is provided', () => {
    const filters = generateFilters(
      mockFilterManager,
      {
        ...FIELD,
        type: 'date',
        esTypes: ['date_nanos'],
      } as DataViewFieldBase,
      '2023-04-27T18:49:15.948123456Z',
      '+',
      MOCKED_INDEX
    ) as RangeFilter[];
    expect(filters).toHaveLength(1);
    const [filter] = filters;
    expect(filter.meta.index === INDEX_NAME);
    expect(filter.meta.negate).toBeFalsy();
    expect(isRangeFilter(filter)).toBeTruthy();
    expect(filter.query.range).toEqual({
      [FIELD.name]: {
        format: 'strict_date_optional_time_nanos',
        gte: expect.stringContaining('2023-04-27T18:49:15.948123456Z'),
        lte: expect.stringContaining('2023-04-27T18:49:15.948123456Z'),
      },
    });
  });

  it('should update an existing date range filter', () => {
    const [filter] = generateFilters(
      mockFilterManager,
      {
        ...FIELD,
        type: 'date',
      } as DataViewFieldBase,
      '2022-08-01',
      '+',
      MOCKED_INDEX
    ) as RangeFilter[];
    filtersArray.push(filter);

    generateFilters(
      mockFilterManager,
      {
        ...FIELD,
        type: 'date',
      } as DataViewFieldBase,
      '2022-08-01',
      '-',
      MOCKED_INDEX
    ) as RangeFilter[];

    expect(filter).toHaveProperty('meta.negate', true);
  });
  describe('with multiValueRelation', () => {
    const ANOTHER_PHRASE = 'another-value';
    const OPTIONS = { multiValueRelation: BooleanRelation.AND };

    it('should combine multiple values into a single filter', () => {
      const filters = generateFilters(
        mockFilterManager,
        FIELD,
        [PHRASE_VALUE, ANOTHER_PHRASE],
        '+',
        MOCKED_INDEX,
        OPTIONS
      );

      expect(filters).toHaveLength(1);
      expect(isCombinedFilter(filters[0])).toBeTruthy();

      const { meta } = filters[0] as CombinedFilter;
      expect(meta.relation).toBe(BooleanRelation.AND);
      expect(meta.key).toBe(FIELD.name);
      expect(meta.index).toBe(INDEX_NAME);
      expect(meta.negate).toBeFalsy();
      expect(meta.params).toHaveLength(2);
      expect(meta.params.every(isPhraseFilter)).toBeTruthy();
      expect(meta.params.map((subFilter) => subFilter.query?.match_phrase)).toEqual([
        { [FIELD.name]: PHRASE_VALUE },
        { [FIELD.name]: ANOTHER_PHRASE },
      ]);
    });

    it('should negate the sub filters rather than the combined filter, to keep the query identical to separate filters', () => {
      const filters = generateFilters(
        mockFilterManager,
        FIELD,
        [PHRASE_VALUE, ANOTHER_PHRASE],
        '-',
        MOCKED_INDEX,
        OPTIONS
      );

      const { meta } = filters[0] as CombinedFilter;
      expect(meta.negate).toBeFalsy();
      expect(meta.params.map((subFilter) => subFilter.meta.negate)).toEqual([true, true]);
    });

    it('should not combine a single value', () => {
      const filters = generateFilters(
        mockFilterManager,
        FIELD,
        PHRASE_VALUE,
        '+',
        MOCKED_INDEX,
        OPTIONS
      );

      expect(filters).toHaveLength(1);
      expect(isCombinedFilter(filters[0])).toBeFalsy();
      expect(isPhraseFilter(filters[0])).toBeTruthy();
    });

    it('should not combine values of an exists filter', () => {
      const filters = generateFilters(
        mockFilterManager,
        EXISTS_FIELD_NAME,
        [FIELD.name, 'another-field'],
        '+',
        MOCKED_INDEX,
        OPTIONS
      );

      expect(filters).toHaveLength(2);
      expect(filters.every(isExistsFilter)).toBeTruthy();
    });

    it('should combine duplicated values only once', () => {
      const filters = generateFilters(
        mockFilterManager,
        FIELD,
        [PHRASE_VALUE, ANOTHER_PHRASE, PHRASE_VALUE],
        '+',
        MOCKED_INDEX,
        OPTIONS
      );

      expect((filters[0] as CombinedFilter).meta.params).toHaveLength(2);
    });

    it('should toggle an existing combined filter instead of adding a duplicate', () => {
      const [filter] = generateFilters(
        mockFilterManager,
        FIELD,
        [PHRASE_VALUE, ANOTHER_PHRASE],
        '+',
        MOCKED_INDEX,
        OPTIONS
      );
      filter.meta.disabled = true;
      filtersArray.push(filter);

      const filters = generateFilters(
        mockFilterManager,
        FIELD,
        [PHRASE_VALUE, ANOTHER_PHRASE],
        '-',
        MOCKED_INDEX,
        OPTIONS
      );

      expect(filters).toHaveLength(1);
      expect(filters[0]).toBe(filter);
      expect(filter.meta.disabled).toBe(false);
      expect(
        (filter as CombinedFilter).meta.params.map((subFilter) => subFilter.meta.negate)
      ).toEqual([true, true]);
    });

    it('should not reuse a combined filter that holds different values', () => {
      const [filter] = generateFilters(
        mockFilterManager,
        FIELD,
        [PHRASE_VALUE, ANOTHER_PHRASE],
        '+',
        MOCKED_INDEX,
        OPTIONS
      );
      filtersArray.push(filter);

      const filters = generateFilters(
        mockFilterManager,
        FIELD,
        [PHRASE_VALUE, 'a-third-value'],
        '+',
        MOCKED_INDEX,
        OPTIONS
      );

      expect(filters[0]).not.toBe(filter);
    });

    it('should combine date values into a single filter of range sub filters', () => {
      const DATE_FIELD = { ...FIELD, type: 'date' } as DataViewFieldBase;
      const filters = generateFilters(
        mockFilterManager,
        DATE_FIELD,
        ['2022-08-01', '2022-08-02'],
        '+',
        MOCKED_INDEX,
        OPTIONS
      );

      const { meta } = filters[0] as CombinedFilter;
      expect(meta.params).toHaveLength(2);
      expect(meta.params.every(isRangeFilter)).toBeTruthy();
    });
  });
});
