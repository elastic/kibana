/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_DATA_VIEW_SPEC_TYPE,
} from '@kbn/as-code-data-views-schema';
import { toAsCodeDataView, toAsCodeSavedDataView } from './to_as_code_data_view';
import { toDataViewSpec } from './to_data_view_spec';

describe('toAsCodeDataView', () => {
  it('maps string index to data_view_reference', () => {
    expect(toAsCodeDataView('my-id')).toEqual({
      type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
      ref_id: 'my-id',
    });
  });

  it('maps inline allowHidden to allow_hidden_indices and round-trips', () => {
    const stored = {
      title: 'my-hidden-*',
      timeFieldName: '@timestamp',
      allowHidden: true,
    };
    const api = toAsCodeDataView(stored);
    expect(api).toEqual({
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'my-hidden-*',
      time_field: '@timestamp',
      allow_hidden_indices: true,
    });
    expect(toDataViewSpec(api)).toEqual(stored);
  });

  it('omits allow_hidden_indices when allowHidden is undefined', () => {
    const api = toAsCodeDataView({ title: 'logs-*' });
    expect(api).not.toHaveProperty('allow_hidden_indices');
  });

  it('maps inline name and round-trips', () => {
    const stored = {
      title: 'logs-*',
      timeFieldName: '@timestamp',
      name: 'My logs',
    };
    const api = toAsCodeDataView(stored);
    expect(api).toEqual({
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'logs-*',
      time_field: '@timestamp',
      name: 'My logs',
    });
    expect(toDataViewSpec(api)).toEqual(stored);
  });

  it('omits name when the stored spec has no name', () => {
    const api = toAsCodeDataView({ title: 'logs-*', timeFieldName: '@timestamp' });
    expect(api).not.toHaveProperty('name');
  });

  it('maps sourceFilters to field_filters and round-trips', () => {
    const stored = {
      title: 'logs-*',
      timeFieldName: '@timestamp',
      sourceFilters: [{ value: 'field_a' }, { value: 'field_b' }],
    };
    const api = toAsCodeDataView(stored);
    expect(api).toEqual({
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'logs-*',
      time_field: '@timestamp',
      field_filters: ['field_a', 'field_b'],
    });
    expect(toDataViewSpec(api)).toEqual(stored);
  });

  it('omits field_filters when sourceFilters is empty', () => {
    const api = toAsCodeDataView({
      title: 'logs-*',
      sourceFilters: [],
    });
    expect(api).not.toHaveProperty('field_filters');
  });

  it('omits field_filters when sourceFilters is absent', () => {
    const api = toAsCodeDataView({ title: 'logs-*' });
    expect(api).not.toHaveProperty('field_filters');
  });

  it('maps inline spec with indexed field formats and attrs to field_settings', () => {
    expect(
      toAsCodeDataView({
        title: 'logs-*',
        timeFieldName: '@timestamp',
        fieldFormats: { bytes_field: { id: 'bytes' } },
        fieldAttrs: { host_name: { customLabel: 'Host', customDescription: 'Hostname' } },
      })
    ).toEqual({
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'logs-*',
      time_field: '@timestamp',
      field_settings: {
        bytes_field: {
          format: { type: 'bytes', params: {} },
        },
        host_name: {
          custom_label: 'Host',
          custom_description: 'Hostname',
        },
      },
    });
  });

  it('round-trips indexed field_attrs and field_formats with toDataViewSpec', () => {
    const stored = {
      title: 'logs-*',
      timeFieldName: '@timestamp',
      fieldFormats: { id: { id: 'string' } },
      fieldAttrs: { message: { customLabel: 'Msg' } },
    };
    const api = toAsCodeDataView(stored);
    expect(toDataViewSpec(api)).toEqual(stored);
  });

  it('round-trips runtime fields and indexed field_settings together', () => {
    const stored = {
      title: 'logs-*',
      timeFieldName: '@timestamp',
      runtimeFieldMap: { rt: { type: 'keyword' as const } },
      fieldFormats: { rt: { id: 'string' }, mapped: { id: 'bytes' } },
      fieldAttrs: { rt: { customLabel: 'Runtime' }, mapped: { customLabel: 'Mapped' } },
    };
    const api = toAsCodeDataView(stored);
    expect(toDataViewSpec(api)).toEqual(stored);
  });

  it('inlines primitive runtime field metadata under field_settings', () => {
    expect(
      toAsCodeDataView({
        title: 'logs-*',
        runtimeFieldMap: { rt: { type: 'keyword' } },
        fieldFormats: { rt: { id: 'string' }, mapped: { id: 'bytes' } },
        fieldAttrs: { rt: { customLabel: 'Runtime' }, mapped: { customLabel: 'Mapped' } },
      })
    ).toEqual({
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'logs-*',
      time_field: undefined,
      field_settings: {
        rt: {
          type: 'keyword',
          format: { type: 'string', params: {} },
          custom_label: 'Runtime',
        },
        mapped: {
          format: { type: 'bytes', params: {} },
          custom_label: 'Mapped',
        },
      },
    });
  });

  it('inlines composite runtime fields with nested field_settings for subfields', () => {
    expect(
      toAsCodeDataView({
        title: 'logs-*',
        runtimeFieldMap: {
          parent: { type: 'composite', fields: { child: { type: 'keyword' } } },
        },
        fieldFormats: { 'parent.child': { id: 'string' }, mapped: { id: 'bytes' } },
        fieldAttrs: { 'parent.child': { customLabel: 'Runtime subfield' } },
      })
    ).toEqual({
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'logs-*',
      time_field: undefined,
      field_settings: {
        parent: {
          type: 'composite',
          fields: {
            child: {
              type: 'keyword',
              format: { type: 'string', params: {} },
              custom_label: 'Runtime subfield',
            },
          },
        },
        mapped: {
          format: { type: 'bytes', params: {} },
        },
      },
    });
  });
});

describe('toAsCodeSavedDataView', () => {
  it('returns saved data view shape and includes popularity', () => {
    expect(
      toAsCodeSavedDataView({
        id: 'saved-id',
        name: 'Saved logs',
        allowHidden: true,
        title: 'logs-*',
        timeFieldName: '@timestamp',
        runtimeFieldMap: { rt: { type: 'keyword' } },
        fieldAttrs: {
          mapped: { count: 10, customLabel: 'Mapped' },
          rt: { count: 5 },
        },
      })
    ).toEqual({
      id: 'saved-id',
      name: 'Saved logs',
      allow_hidden_indices: true,
      index_pattern: 'logs-*',
      time_field: '@timestamp',
      field_settings: {
        mapped: {
          popularity: 10,
          custom_label: 'Mapped',
        },
        rt: {
          type: 'keyword',
          popularity: 5,
        },
      },
    });
  });

  it('maps sourceFilters to field_filters', () => {
    expect(
      toAsCodeSavedDataView({
        title: 'logs-*',
        sourceFilters: [{ value: 'field_a' }, { value: 'field_b' }],
      })
    ).toEqual(
      expect.objectContaining({
        field_filters: ['field_a', 'field_b'],
      })
    );
  });

  it('omits field_filters when sourceFilters is empty', () => {
    const result = toAsCodeSavedDataView({
      title: 'logs-*',
      sourceFilters: [],
    });

    expect(result).not.toHaveProperty('field_filters');
  });

  it('omits field_filters when sourceFilters is absent', () => {
    const result = toAsCodeSavedDataView({
      title: 'logs-*',
    });

    expect(result).not.toHaveProperty('field_filters');
  });

  describe('scripted fields', () => {
    const doubleBytes = {
      name: 'double_bytes',
      type: 'number',
      scripted: true,
      searchable: true,
      aggregatable: true,
      lang: 'painless',
      script: "doc['bytes'].value * 2",
    };

    it('maps scripted fields to scripted_fields', () => {
      const result = toAsCodeSavedDataView({
        title: 'logs-*',
        fields: { double_bytes: doubleBytes },
      });

      expect(result.scripted_fields).toEqual({
        double_bytes: { type: 'number', lang: 'painless', script: "doc['bytes'].value * 2" },
      });
    });

    it('includes the format, attributes and popularity in the scripted field entry', () => {
      const result = toAsCodeSavedDataView({
        title: 'logs-*',
        fields: { double_bytes: doubleBytes },
        fieldFormats: {
          double_bytes: { id: 'bytes', params: { pattern: '0,0.0b' } },
          other: { id: 'number', params: { pattern: '0,0' } },
        },
        fieldAttrs: {
          double_bytes: { customLabel: 'Double', customDescription: 'Bytes x2', count: 2 },
        },
      });

      expect(result.scripted_fields?.double_bytes).toEqual({
        type: 'number',
        lang: 'painless',
        script: "doc['bytes'].value * 2",
        custom_label: 'Double',
        custom_description: 'Bytes x2',
        format: { type: 'bytes', params: { pattern: '0,0.0b' } },
        popularity: 2,
      });
      // The overrides are stored by field name, so they are kept in `field_settings` too
      expect(result.field_settings).toEqual({
        double_bytes: {
          custom_label: 'Double',
          custom_description: 'Bytes x2',
          format: { type: 'bytes', params: { pattern: '0,0.0b' } },
          popularity: 2,
        },
        other: { format: { type: 'number', params: { pattern: '0,0' } } },
      });
    });

    it('ignores scripted fields without a script', () => {
      const result = toAsCodeSavedDataView({
        title: 'logs-*',
        fields: {
          empty: { ...doubleBytes, name: 'empty', script: '' },
          missing: { ...doubleBytes, name: 'missing', script: undefined },
        },
      });

      expect(result).not.toHaveProperty('scripted_fields');
    });

    it('ignores non scripted fields', () => {
      const result = toAsCodeSavedDataView({
        title: 'logs-*',
        fields: { bytes: { name: 'bytes', type: 'number', searchable: true, aggregatable: true } },
      });

      expect(result).not.toHaveProperty('scripted_fields');
    });

    it('omits scripted_fields when there are no fields', () => {
      expect(toAsCodeSavedDataView({ title: 'logs-*' })).not.toHaveProperty('scripted_fields');
    });
  });
});
