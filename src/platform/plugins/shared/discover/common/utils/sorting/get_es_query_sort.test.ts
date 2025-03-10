/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SortDirection } from '@kbn/data-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import {
  getEsQuerySort,
  getESQuerySortForTieBreaker,
  getESQuerySortForTimeField,
  getTieBreakerFieldName,
} from './get_es_query_sort';
import { CONTEXT_TIE_BREAKER_FIELDS_SETTING } from '@kbn/discover-utils';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

const dataView = createStubDataView({
  spec: {
    id: 'logstash-*',
    fields: {
      test_field: {
        name: 'test_field',
        type: 'string',
        esTypes: ['keyword'],
        aggregatable: true,
        searchable: true,
      },
      test_field_not_sortable: {
        name: 'test_field_not_sortable',
        type: 'string',
        esTypes: ['keyword'],
        aggregatable: false,
        searchable: false,
      },
    },
    title: 'logstash-*',
    timeFieldName: '@timestamp',
  },
});

describe('get_es_query_sort', function () {
  test('getEsQuerySort should return sort params', function () {
    expect(
      getEsQuerySort({
        sortDir: SortDirection.desc,
        timeFieldName: 'testTimeField',
        isTimeNanosBased: false,
        tieBreakerFieldName: 'testTieBreakerField',
      })
    ).toStrictEqual([
      { testTimeField: { format: 'strict_date_optional_time', order: 'desc' } },
      { testTieBreakerField: 'desc' },
    ]);

    expect(
      getEsQuerySort({
        sortDir: SortDirection.asc,
        timeFieldName: 'testTimeField',
        isTimeNanosBased: true,
        tieBreakerFieldName: 'testTieBreakerField',
      })
    ).toStrictEqual([
      {
        testTimeField: {
          format: 'strict_date_optional_time_nanos',
          numeric_type: 'date_nanos',
          order: 'asc',
        },
      },
      { testTieBreakerField: 'asc' },
    ]);
  });

  test('getESQuerySortForTimeField should return time field as sort param', function () {
    expect(
      getESQuerySortForTimeField({
        sortDir: SortDirection.desc,
        timeFieldName: 'testTimeField',
        isTimeNanosBased: false,
      })
    ).toStrictEqual({
      testTimeField: {
        format: 'strict_date_optional_time',
        order: 'desc',
      },
    });

    expect(
      getESQuerySortForTimeField({
        sortDir: SortDirection.asc,
        timeFieldName: 'testTimeField',
        isTimeNanosBased: true,
      })
    ).toStrictEqual({
      testTimeField: {
        format: 'strict_date_optional_time_nanos',
        numeric_type: 'date_nanos',
        order: 'asc',
      },
    });
  });

  test('getESQuerySortForTieBreaker should return tie breaker as sort param', function () {
    expect(
      getESQuerySortForTieBreaker({
        sortDir: SortDirection.desc,
        tieBreakerFieldName: 'testTieBreaker',
      })
    ).toStrictEqual({ testTieBreaker: 'desc' });
  });

  test('getTieBreakerFieldName should return a correct tie breaker', function () {
    expect(
      getTieBreakerFieldName(dataView, {
        get: (key) => (key === CONTEXT_TIE_BREAKER_FIELDS_SETTING ? ['_doc'] : undefined),
      } as IUiSettingsClient)
    ).toBe('_doc');

    expect(
      getTieBreakerFieldName(dataView, {
        get: (key) =>
          key === CONTEXT_TIE_BREAKER_FIELDS_SETTING
            ? ['test_field_not_sortable', '_doc']
            : undefined,
      } as IUiSettingsClient)
    ).toBe('_doc');

    expect(
      getTieBreakerFieldName(dataView, {
        get: (key) =>
          key === CONTEXT_TIE_BREAKER_FIELDS_SETTING ? ['test_field', '_doc'] : undefined,
      } as IUiSettingsClient)
    ).toBe('test_field');

    expect(
      getTieBreakerFieldName(dataView, {
        get: (key) => undefined,
      } as IUiSettingsClient)
    ).toBeUndefined();
  });
});
