/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { QueryPointEventAnnotationOutput } from '../query_point_event_annotation/types';
import { postprocessAnnotations } from './utils';

const annotationConfig: QueryPointEventAnnotationOutput = {
  type: 'query_point_event_annotation',
  id: 'ann1',
  filter: { type: 'kibana_query', language: 'kuery', query: '*' },
  extraFields: ['kibana.alert.reason', 'monitor.name'],
  timeField: 'kibana.alert.start',
  label: 'Alert',
};

const esaggsResponse: Datatable = {
  type: 'datatable',
  columns: [
    {
      id: 'col-4-5',
      name: 'First 10 "kibana.alert.reason" values by "kibana.alert.start"',
      meta: { type: 'string', params: { id: 'string' } },
    },
    {
      id: 'col-5-6',
      name: 'First 10 "monitor.name" values by "kibana.alert.start"',
      meta: { type: 'string' },
    },
  ],
  rows: [
    {
      'col-0-1': 'ann1',
      'col-1-2': 1657922400000,
      'col-2-3': 1,
      'col-3-4': '2022-07-16T15:27:22.000Z',
      'col-4-5': 'Monitor is down',
      'col-5-6': 'homepage',
    },
  ],
};

const fieldsColIdMap = {
  'kibana.alert.reason': 'col-4-5',
  'monitor.name': 'col-5-6',
};

describe('postprocessAnnotations extra field columns', () => {
  it('uses the data-view display name as the column name when provided', () => {
    const result = postprocessAnnotations(
      [
        {
          response: esaggsResponse,
          fieldsColIdMap,
          fieldDisplayNames: {
            'kibana.alert.reason': 'Reason',
          },
        },
      ],
      [annotationConfig],
      []
    );

    expect(result.columns.find((col) => col.id === 'field:kibana.alert.reason')).toEqual(
      expect.objectContaining({
        id: 'field:kibana.alert.reason',
        name: 'Reason',
        meta: { type: 'string', params: { id: 'string' } },
      })
    );
  });

  it('falls back to the ES field name when no display name is provided', () => {
    const result = postprocessAnnotations(
      [
        {
          response: esaggsResponse,
          fieldsColIdMap,
        },
      ],
      [annotationConfig],
      []
    );

    expect(result.columns.find((col) => col.id === 'field:kibana.alert.reason')?.name).toBe(
      'kibana.alert.reason'
    );
    expect(result.columns.find((col) => col.id === 'field:monitor.name')?.name).toBe(
      'monitor.name'
    );
  });
});
