/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toDataViewResource } from './data_view_resource';

// Data views are given as the data views service's `savedObjectToSpec` returns them.
describe('toDataViewResource', () => {
  it('maps title, name, time field, source filters, field formats, runtime fields, field attributes and allow-no-index onto the data_view block', () => {
    const { body, droppedFields } = toDataViewResource({
      title: 'logs-*',
      name: 'Web logs',
      timeFieldName: '@timestamp',
      allowNoIndex: true,
      sourceFilters: [{ value: 'secret.*', clientId: 1 }, { value: 'debug' }],
      fieldFormats: {
        bytes: { id: 'bytes', params: { pattern: '0,0.[0]b' } },
        url: {
          id: 'url',
          params: { type: 'img', urlTemplate: 'https://x/{{value}}', width: 32, height: 16 },
        },
        status: {
          id: 'color',
          params: {
            fieldType: 'string',
            // Kibana's editor writes `boolean` on every rule; only a boolean field uses it.
            colors: [{ regex: '5..', text: '#ffffff', background: '#bd271e', boolean: 'true' }],
          },
        },
        level: {
          id: 'static_lookup',
          params: { lookupEntries: [{ key: '1', value: 'low' }], unknownKeyValue: '?' },
        },
        took: {
          id: 'duration',
          params: {
            inputFormat: 'milliseconds',
            outputFormat: 'humanizePrecise',
            outputPrecision: 2,
            includeSpaceWithSuffix: true,
            useShortSuffix: false,
          },
        },
        host: { id: 'string', params: { transform: 'upper' } },
        message: { id: 'truncate', params: { fieldLength: 40 } },
        '@timestamp': { id: 'date', params: { pattern: 'HH:mm', timezone: 'UTC' } },
        label: { id: 'url', params: { labelTemplate: '{{value}}' } },
        count: { id: 'number' },
      },
      runtimeFieldMap: {
        day: { type: 'keyword', script: { source: "emit(doc['@timestamp'].value.dayOfWeek)" } },
      },
      fieldAttrs: { host: { customLabel: 'Host', count: 3 }, day: { count: 1 } },
    });

    expect(droppedFields).toEqual([]);
    expect(body).toEqual({
      data_view: {
        title: 'logs-*',
        name: 'Web logs',
        time_field_name: '@timestamp',
        allow_no_index: true,
        source_filters: ['secret.*', 'debug'],
        field_formats: {
          bytes: { id: 'bytes', params: { pattern: '0,0.[0]b' } },
          url: {
            id: 'url',
            params: { type: 'img', urltemplate: 'https://x/{{value}}', width: 32, height: 16 },
          },
          status: {
            id: 'color',
            params: {
              field_type: 'string',
              colors: [{ regex: '5..', text: '#ffffff', background: '#bd271e' }],
            },
          },
          level: {
            id: 'static_lookup',
            params: { lookup_entries: [{ key: '1', value: 'low' }], unknown_key_value: '?' },
          },
          took: {
            id: 'duration',
            params: {
              input_format: 'milliseconds',
              output_format: 'humanizePrecise',
              output_precision: 2,
              include_space_with_suffix: true,
              use_short_suffix: false,
            },
          },
          host: { id: 'string', params: { transform: 'upper' } },
          message: { id: 'truncate', params: { field_length: 40 } },
          '@timestamp': { id: 'date', params: { pattern: 'HH:mm', timezone: 'UTC' } },
          label: { id: 'url', params: { labeltemplate: '{{value}}' } },
          count: { id: 'number' },
        },
        runtime_field_map: {
          day: { type: 'keyword', script_source: "emit(doc['@timestamp'].value.dayOfWeek)" },
        },
        field_attrs: { host: { custom_label: 'Host', count: 3 }, day: { count: 1 } },
      },
    });
  });

  it('writes only the title for a data view with no other settings', () => {
    expect(
      toDataViewResource({
        title: 'metrics-*',
        allowNoIndex: false,
        allowHidden: false,
        sourceFilters: [],
        fieldFormats: {},
        runtimeFieldMap: {},
        fieldAttrs: {},
        fields: {},
      })
    ).toEqual({ body: { data_view: { title: 'metrics-*' } }, droppedFields: [] });
  });

  it('reports the settings the data_view block cannot hold as dropped fields, and keeps the rest', () => {
    const { body, droppedFields } = toDataViewResource({
      title: 'logs-*',
      allowHidden: true,
      type: 'rollup',
      typeMeta: { params: { rollup_index: 'r' } },
      fieldFormats: {
        took: { id: 'duration', params: { outputFormat: 'humanize', showSuffix: true } },
        bucket: { id: 'histogram', params: { id: 'number', params: { pattern: '0' } } },
        status: { id: 'color', params: { colors: [{ range: '0:10', text: '#000', id: 2 }] } },
        flag: {
          id: 'color',
          params: { fieldType: 'boolean', colors: [{ boolean: 'false', text: '#000' }] },
        },
        size: { id: 'truncate', params: { fieldLength: 'long' } },
      },
      runtimeFieldMap: {
        day: { type: 'keyword', script: { source: 'emit("x")' } },
        source_only: { type: 'keyword' },
        parts: {
          type: 'composite',
          script: { source: 'emit(Map.of())' },
          fields: { a: { type: 'keyword' } },
        },
      },
      fieldAttrs: { host: { customLabel: 'Host', customDescription: 'Where' } },
      fields: {
        plain: { name: 'plain', type: 'string', searchable: true, aggregatable: true },
        doubled: {
          name: 'doubled',
          type: 'number',
          searchable: true,
          aggregatable: true,
          scripted: true,
          script: "doc['x'].value * 2",
        },
      },
    });

    expect(droppedFields).toEqual([
      'allowHidden',
      'type',
      'typeMeta',
      'fieldFormats.took.params.showSuffix',
      'fieldFormats.bucket.params.id',
      'fieldFormats.bucket.params.params',
      'fieldFormats.status.params.colors[0].id',
      'fieldFormats.flag.params.colors[0].boolean',
      'fieldFormats.size.params.fieldLength',
      'runtimeFieldMap.source_only',
      'runtimeFieldMap.parts',
      'fieldAttrs.host.customDescription',
      'fields.doubled',
    ]);
    expect(body).toEqual({
      data_view: {
        title: 'logs-*',
        field_formats: {
          took: { id: 'duration', params: { output_format: 'humanize' } },
          bucket: { id: 'histogram' },
          status: { id: 'color', params: { colors: [{ range: '0:10', text: '#000' }] } },
          flag: { id: 'color', params: { field_type: 'boolean', colors: [{ text: '#000' }] } },
          size: { id: 'truncate' },
        },
        runtime_field_map: { day: { type: 'keyword', script_source: 'emit("x")' } },
        field_attrs: { host: { custom_label: 'Host' } },
      },
    });
  });
});
