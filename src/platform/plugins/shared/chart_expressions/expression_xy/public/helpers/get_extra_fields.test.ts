/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
import type { PointEventAnnotationRow } from '@kbn/event-annotation-plugin/common';
import { getExtraFields } from './get_extra_fields';

const formatFactory = jest.fn() as jest.MockedFunction<FormatFactory>;

const row: PointEventAnnotationRow = {
  id: 'ann1',
  time: '2022-07-16T15:27:22.000Z',
  type: 'point',
  timebucket: '2022-07-16T00:00:00.000Z',
  label: 'Alert',
  'field:kibana.alert.reason': 'Monitor is down',
  'field:kibana.alert.duration.us': 480000000,
};

describe('getExtraFields', () => {
  beforeEach(() => {
    formatFactory.mockReset();
  });

  it('uses the datatable column name as the tooltip label', () => {
    const columns: DatatableColumn[] = [
      { id: 'field:kibana.alert.reason', name: 'Reason', meta: { type: 'string' } },
      {
        id: 'field:kibana.alert.duration.us',
        name: 'Duration',
        meta: { type: 'number', params: { id: 'duration' } },
      },
    ];
    const formatter = { convertToText: jest.fn() };
    formatFactory.mockReturnValue(formatter as ReturnType<FormatFactory>);

    expect(getExtraFields(row, formatFactory, columns)).toEqual([
      expect.objectContaining({
        key: 'field:kibana.alert.reason',
        name: 'Reason',
      }),
      expect.objectContaining({
        key: 'field:kibana.alert.duration.us',
        name: 'Duration',
        formatter,
      }),
    ]);
  });

  it('falls back to the ES field name when no column name is available', () => {
    expect(getExtraFields(row, formatFactory, undefined).map((field) => field.name)).toEqual([
      'kibana.alert.reason',
      'kibana.alert.duration.us',
    ]);
  });
});
