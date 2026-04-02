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
      id: 'my-data-view-id',
    };
    const result = toStoredDataView(dataView);
    expect(result).toBe('my-data-view-id');
  });

  it('converts index-pattern data_source to serialized index spec', () => {
    const dataView: AsCodeDataViewSpec = {
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'my-index-*',
      time_field: '@timestamp',
      runtime_fields: [
        {
          name: 'rt',
          type: 'keyword',
          script: 'emit(doc["id"].value)',
          format: { type: 'string' },
        },
      ],
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
});
