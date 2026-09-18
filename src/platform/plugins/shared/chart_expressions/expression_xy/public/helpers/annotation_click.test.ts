/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MergedAnnotation } from '../../common';
import type { PointEventAnnotationRow } from '@kbn/event-annotation-plugin/common';
import {
  getLineAnnotationChartId,
  mapAnnotationClickEvents,
  toAnnotationClickDatum,
} from './annotation_click';

const pointRow = (overrides: Partial<PointEventAnnotationRow> = {}): PointEventAnnotationRow => ({
  id: 'ann-1',
  time: '2022-03-18T08:25:17.140Z',
  type: 'point',
  timebucket: '2022-03-18T08:25:00.000Z',
  label: 'Alert',
  ...overrides,
});

describe('annotation click helpers', () => {
  it('builds a stable chart id from config id and time', () => {
    expect(getLineAnnotationChartId('ann-1', '2022-03-18T08:25:17.140Z')).toBe(
      'ann_1_2022_03_18_t_08_25_17_140_z'
    );
  });

  it('maps query extra fields without the field: prefix', () => {
    expect(
      toAnnotationClickDatum(
        pointRow({
          'field:kibana.alert.uuid': 'abc-123',
          'field:monitor.id': 'mon-1',
        })
      )
    ).toEqual({
      id: 'ann-1',
      type: 'point',
      time: '2022-03-18T08:25:17.140Z',
      label: 'Alert',
      extras: {
        'kibana.alert.uuid': 'abc-123',
        'monitor.id': 'mon-1',
      },
    });
  });

  it('maps clicked line and range markers back to original annotation ids', () => {
    const row = pointRow();
    const grouped: MergedAnnotation = {
      ...row,
      timebucket: Date.parse(row.timebucket),
      position: 'bottom',
      customTooltip: () => null,
      isGrouped: false,
      rows: [row],
    };

    const annotations = mapAnnotationClickEvents({
      lines: [
        {
          id: getLineAnnotationChartId(row.id, row.time),
          datum: { dataValue: row.time, details: row.label },
        },
      ],
      rects: [
        {
          id: 'range-1',
          datum: {
            coordinates: { x0: 1, x1: 2, y0: null, y1: null },
            details: 'Range',
          },
        },
      ],
      groupedLineAnnotations: [grouped],
      rangeAnnotations: [
        {
          id: 'range-1',
          time: '2022-03-18T08:25:17.140Z',
          endTime: '2022-03-31T08:25:17.140Z',
          type: 'range',
          label: 'Range',
        },
      ],
    });

    expect(annotations).toEqual([
      {
        id: 'ann-1',
        type: 'point',
        time: '2022-03-18T08:25:17.140Z',
        label: 'Alert',
      },
      {
        id: 'range-1',
        type: 'range',
        time: '2022-03-18T08:25:17.140Z',
        endTime: '2022-03-31T08:25:17.140Z',
        label: 'Range',
      },
    ]);
  });

  it('expands grouped line markers into every source row', () => {
    const rows = [
      pointRow({ id: 'event1', time: '2022-03-18T08:25:00.000Z', label: 'Event 1' }),
      pointRow({ id: 'event1', time: '2022-03-18T08:25:00.020Z', label: 'Event 2' }),
    ];
    const grouped: MergedAnnotation = {
      ...rows[0],
      timebucket: Date.parse(rows[0].timebucket),
      position: 'bottom',
      customTooltip: () => null,
      isGrouped: true,
      rows,
    };

    expect(
      mapAnnotationClickEvents({
        lines: [
          {
            id: getLineAnnotationChartId(grouped.id, grouped.time),
            datum: { dataValue: grouped.time, details: grouped.label },
          },
        ],
        rects: [],
        groupedLineAnnotations: [grouped],
        rangeAnnotations: [],
      })
    ).toEqual([
      {
        id: 'event1',
        type: 'point',
        time: '2022-03-18T08:25:00.000Z',
        label: 'Event 1',
        isGrouped: true,
      },
      {
        id: 'event1',
        type: 'point',
        time: '2022-03-18T08:25:00.020Z',
        label: 'Event 2',
        isGrouped: true,
      },
    ]);
  });
});
