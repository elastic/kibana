/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { indexPatternMock as dataViewMock } from '../__mocks__/index_pattern';
import { formatHit } from './format_hit';
import { discoverServiceMock } from '../__mocks__/services';
import { buildDataRecord } from '../application/main/utils/fetch_all';
import { DataTableRecord } from '../types';

describe('formatHit', () => {
  let row: DataTableRecord;
  let hit: estypes.SearchHit;
  beforeEach(() => {
    hit = {
      _id: '1',
      _index: 'logs',
      fields: {
        message: ['foobar'],
        extension: ['png'],
        'object.value': [42, 13],
        bytes: [123],
      },
    };
    row = buildDataRecord(hit, dataViewMock);
    (dataViewMock.getFormatterForField as jest.Mock).mockReturnValue({
      convert: (value: unknown) => `formatted:${value}`,
    });
  });

  afterEach(() => {
    (discoverServiceMock.uiSettings.get as jest.Mock).mockReset();
  });

  it('formats a document as expected', () => {
    const formatted = formatHit(
      row.raw,
      row.flattened,
      dataViewMock,
      ['message', 'extension', 'object.value'],
      220,
      discoverServiceMock.fieldFormats
    );
    expect(formatted).toEqual([
      ['extension', 'formatted:png'],
      ['message', 'formatted:foobar'],
      ['object.value', 'formatted:42,13'],
      ['_index', 'formatted:logs'],
      ['_score', undefined],
    ]);
  });

  it('orders highlighted fields first', () => {
    const formatted = formatHit(
      { ...row.raw, highlight: { message: ['%%'] } },
      row.flattened,
      dataViewMock,
      ['message', 'extension', 'object.value'],
      220,
      discoverServiceMock.fieldFormats
    );
    expect(formatted.map(([fieldName]) => fieldName)).toEqual([
      'message',
      'extension',
      'object.value',
      '_index',
      '_score',
    ]);
  });

  it('only limits count of pairs based on advanced setting', () => {
    const formatted = formatHit(
      row.raw,
      row.flattened,
      dataViewMock,
      ['message', 'extension', 'object.value'],
      2,
      discoverServiceMock.fieldFormats
    );
    expect(formatted).toEqual([
      ['extension', 'formatted:png'],
      ['message', 'formatted:foobar'],
      ['and 3 more fields', ''],
    ]);
  });

  it('should not include fields not mentioned in fieldsToShow', () => {
    const formatted = formatHit(
      row.raw,
      row.flattened,
      dataViewMock,
      ['message', 'object.value'],
      220,
      discoverServiceMock.fieldFormats
    );
    expect(formatted).toEqual([
      ['message', 'formatted:foobar'],
      ['object.value', 'formatted:42,13'],
      ['_index', 'formatted:logs'],
      ['_score', undefined],
    ]);
  });

  it('should filter fields based on their real name not displayName', () => {
    const formatted = formatHit(
      row.raw,
      row.flattened,
      dataViewMock,
      ['bytes'],
      220,
      discoverServiceMock.fieldFormats
    );
    expect(formatted).toEqual([
      ['bytesDisplayName', 'formatted:123'],
      ['_index', 'formatted:logs'],
      ['_score', undefined],
    ]);
  });
});
