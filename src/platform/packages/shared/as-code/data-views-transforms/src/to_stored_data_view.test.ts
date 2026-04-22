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
  type AsCodeDataViewReference,
  type AsCodeDataViewSpec,
} from '@kbn/as-code-data-views-schema';
import { toStoredDataView } from './to_stored_data_view';

describe('toStoredDataView', () => {
  it('converts data_view_reference data_source to string id', () => {
    const dataView: AsCodeDataViewReference = {
      type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
      ref_id: 'my-data-view-id',
    };
    const result = toStoredDataView(dataView);
    expect(result).toBe('my-data-view-id');
  });

  it('converts index-pattern data_source to serialized index spec', () => {
    const dataView: AsCodeDataViewSpec = {
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'my-index-*',
      time_field: '@timestamp',
      field_settings: {
        rt: {
          type: 'keyword',
          script: 'emit(doc["id"].value)',
          format: { type: 'string' },
        },
      },
    };
    const result = toStoredDataView(dataView);
    expect(result).toEqual({
      title: 'my-index-*',
      timeFieldName: '@timestamp',
      fieldFormats: {
        rt: { id: 'string', params: undefined },
      },
      fieldAttrs: {
        rt: {},
      },
      runtimeFieldMap: {
        rt: {
          type: 'keyword',
          script: { source: 'emit(doc["id"].value)' },
        },
      },
    });
  });

  it('converts index-pattern data_source without runtime fields', () => {
    const dataView: AsCodeDataViewSpec = {
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'logs-*',
      time_field: '@timestamp',
    };
    const result = toStoredDataView(dataView);
    expect(result).toEqual({
      title: 'logs-*',
      timeFieldName: '@timestamp',
    });
  });

  it('writes indexed field_settings to fieldFormats and fieldAttrs', () => {
    const dataView: AsCodeDataViewSpec = {
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'logs-*',
      field_settings: {
        bytes_field: {
          format: { type: 'bytes', params: { pattern: '0,0.[000]b' } },
        },
        host_name: {
          custom_label: 'Host',
          custom_description: 'Hostname',
        },
      },
    };

    const result = toStoredDataView(dataView);
    expect(result).toEqual({
      title: 'logs-*',
      fieldFormats: {
        bytes_field: { id: 'bytes', params: { pattern: '0,0.[000]b' } },
      },
      fieldAttrs: {
        host_name: { customLabel: 'Host', customDescription: 'Hostname' },
      },
    });
  });

  it('stores a single field_settings entry per field name', () => {
    const dataView: AsCodeDataViewSpec = {
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'logs-*',
      field_settings: {
        rt: { type: 'keyword', format: { type: 'string' } },
      },
    };

    const result = toStoredDataView(dataView);
    expect(result).toEqual({
      title: 'logs-*',
      runtimeFieldMap: {
        rt: {
          type: 'keyword',
        },
      },
      fieldFormats: {
        rt: { id: 'string', params: undefined },
      },
      fieldAttrs: {
        rt: {},
      },
    });
  });
});
