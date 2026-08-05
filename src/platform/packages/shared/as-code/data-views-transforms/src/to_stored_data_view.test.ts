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
  type AsCodeSavedDataView,
} from '@kbn/as-code-data-views-schema';
import { toStoredDataView } from './to_stored_data_view';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';

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
      runtimeFieldMap: {
        rt: {
          type: 'keyword',
          script: { source: 'emit(doc["id"].value)' },
        },
      },
    });
  });

  it('maps inline allow_hidden_indices to allowHidden', () => {
    const dataView: AsCodeDataViewSpec = {
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'my-hidden-*',
      time_field: '@timestamp',
      allow_hidden_indices: true,
    };
    const result = toStoredDataView(dataView);
    expect(result).toEqual({
      title: 'my-hidden-*',
      timeFieldName: '@timestamp',
      allowHidden: true,
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
    });
  });

  describe('when it is a saved data view', () => {
    it('maps saved data view fields and popularity', () => {
      const dataView: AsCodeSavedDataView = {
        id: 'saved-id',
        name: 'Saved logs',
        allow_hidden_indices: true,
        index_pattern: 'logs-*',
        time_field: '@timestamp',
        field_settings: {
          mapped: { popularity: 10 },
          rt: { type: 'keyword', popularity: 5 },
        },
      };

      const result = toStoredDataView(dataView);
      expect(result).toEqual({
        id: 'saved-id',
        name: 'Saved logs',
        allowHidden: true,
        title: 'logs-*',
        timeFieldName: '@timestamp',
        runtimeFieldMap: {
          rt: { type: 'keyword' },
        },
        fieldAttrs: {
          mapped: { count: 10 },
          rt: { count: 5 },
        },
      });
    });

    it('maps field_filters to sourceFilters', () => {
      const dataView: AsCodeSavedDataView = {
        id: 'dv-1',
        index_pattern: 'logs-*',
        field_filters: ['field_a', 'field_b'],
      };

      const result = toStoredDataView(dataView);
      expect(result).toEqual(
        expect.objectContaining({
          sourceFilters: [{ value: 'field_a' }, { value: 'field_b' }],
        })
      );
    });

    it('omits sourceFilters when field_filters is undefined', () => {
      const dataView: AsCodeSavedDataView = {
        id: 'dv-2',
        index_pattern: 'logs-*',
      };

      const result = toStoredDataView(dataView);
      expect(result).toEqual(
        expect.objectContaining({
          title: 'logs-*',
        })
      );
      expect((result as DataViewSpec).sourceFilters).toBeUndefined();
    });
  });
});
