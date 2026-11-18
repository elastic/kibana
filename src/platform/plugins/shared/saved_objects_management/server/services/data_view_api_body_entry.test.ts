/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import { expectApiBodyEntryRoundTrip } from '../mocks';
import { createDataViewApiBodyEntry } from './data_view_api_body_entry';

const storedDataView = (attributes: Partial<DataViewAttributes> = {}) => ({
  attributes: { title: 'logs-*', ...attributes },
  references: [],
});

describe('index-pattern API body entry', () => {
  const entry = createDataViewApiBodyEntry();

  it('round-trips a data view with a runtime field, field settings and field filters', () => {
    const body = expectApiBodyEntryRoundTrip(
      entry,
      storedDataView({
        name: 'Logs',
        timeFieldName: '@timestamp',
        allowHidden: true,
        sourceFilters: JSON.stringify([{ value: 'secret.*' }]),
        runtimeFieldMap: JSON.stringify({
          hour: { type: 'long', script: { source: "emit(doc['@timestamp'].value.getHour())" } },
        }),
        fieldFormatMap: JSON.stringify({ bytes: { id: 'bytes' } }),
        fieldAttrs: JSON.stringify({ 'host.name': { customLabel: 'Host', count: 3 } }),
      })
    );

    expect(body).toEqual({
      name: 'Logs',
      index_pattern: 'logs-*',
      time_field: '@timestamp',
      allow_hidden_indices: true,
      field_filters: ['secret.*'],
      field_settings: {
        hour: { type: 'long', script: "emit(doc['@timestamp'].value.getHour())" },
        bytes: { format: { type: 'bytes', params: {} } },
        'host.name': { custom_label: 'Host', popularity: 3 },
      },
    });
  });

  it('round-trips a data view with only an index pattern', () => {
    expect(expectApiBodyEntryRoundTrip(entry, storedDataView())).toEqual({
      index_pattern: 'logs-*',
    });
  });

  it('leaves out the empty name that data views without one are stored with', () => {
    const { body } = entry.toApi(storedDataView({ name: '' }));

    expect(body).toEqual({ index_pattern: 'logs-*' });
    expect(entry.getSchema().safeParse(body).success).toBe(true);
  });

  it('returns a body the PUT schema rejects when the data view has scripted fields', () => {
    const { body } = entry.toApi(
      storedDataView({
        fields: JSON.stringify([
          {
            name: 'doubled',
            type: 'number',
            scripted: true,
            script: "doc['bytes'].value * 2",
            lang: 'painless',
          },
        ]),
      })
    );

    const { success, error } = entry.getSchema().safeParse(body);

    expect(success).toBe(false);
    expect(JSON.stringify(error?.issues)).toContain('scripted_fields');
  });

  it('reports the rollup settings and allowNoIndex it drops', () => {
    const { warnings } = entry.toApi(
      storedDataView({
        type: 'rollup',
        typeMeta: JSON.stringify({ params: { rollup_index: 'rollup-logs' } }),
        allowNoIndex: true,
      })
    );

    expect(warnings).toEqual([
      { message: expect.stringContaining('rollup') },
      { message: expect.stringContaining('allowNoIndex') },
    ]);
  });
});
