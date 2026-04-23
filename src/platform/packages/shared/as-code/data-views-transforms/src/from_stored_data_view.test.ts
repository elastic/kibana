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
import { fromStoredDataView } from './from_stored_data_view';
import { toStoredDataView } from './to_stored_data_view';

describe('fromStoredDataView', () => {
  it('maps string index to data_view_reference', () => {
    expect(fromStoredDataView('my-id')).toEqual({
      type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
      ref_id: 'my-id',
    });
  });

  it('maps inline spec with indexed field formats and attrs to field_settings', () => {
    expect(
      fromStoredDataView({
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
          format: { type: 'bytes', params: undefined },
        },
        host_name: {
          custom_label: 'Host',
          custom_description: 'Hostname',
        },
      },
    });
  });

  it('round-trips indexed field_attrs and field_formats with toStoredDataView', () => {
    const stored = {
      title: 'logs-*',
      timeFieldName: '@timestamp',
      fieldFormats: { id: { id: 'string' } },
      fieldAttrs: { message: { customLabel: 'Msg' } },
    };
    const api = fromStoredDataView(stored);
    expect(toStoredDataView(api)).toEqual(stored);
  });

  it('round-trips runtime fields and indexed field_settings together', () => {
    const stored = {
      title: 'logs-*',
      timeFieldName: '@timestamp',
      runtimeFieldMap: { rt: { type: 'keyword' as const } },
      fieldFormats: { rt: { id: 'string' }, mapped: { id: 'bytes' } },
      fieldAttrs: { rt: { customLabel: 'Runtime' }, mapped: { customLabel: 'Mapped' } },
    };
    const api = fromStoredDataView(stored);
    expect(toStoredDataView(api)).toEqual(stored);
  });

  it('inlines primitive runtime field metadata under field_settings', () => {
    expect(
      fromStoredDataView({
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
          format: { type: 'string', params: undefined },
          custom_label: 'Runtime',
        },
        mapped: {
          format: { type: 'bytes', params: undefined },
          custom_label: 'Mapped',
        },
      },
    });
  });

  it('inlines composite runtime fields with nested field_settings for subfields', () => {
    expect(
      fromStoredDataView({
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
              format: { type: 'string', params: undefined },
              custom_label: 'Runtime subfield',
            },
          },
        },
        mapped: {
          format: { type: 'bytes', params: undefined },
        },
      },
    });
  });
});
