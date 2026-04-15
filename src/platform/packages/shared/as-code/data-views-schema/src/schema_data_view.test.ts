/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from './constants';
import { dataViewSpecSchema } from './schema_data_view';

describe('dataViewSpecSchema field_settings', () => {
  it('accepts indexed field overrides', () => {
    expect(
      dataViewSpecSchema.validate({
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'logs-*',
        field_settings: {
          bytes_field: { format: { type: 'bytes', params: { pattern: '0,0.[000]b' } } },
          host_name: { custom_label: 'Host', custom_description: 'Hostname field' },
        },
      })
    ).toEqual({
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'logs-*',
      field_settings: {
        bytes_field: { format: { type: 'bytes', params: { pattern: '0,0.[000]b' } } },
        host_name: { custom_label: 'Host', custom_description: 'Hostname field' },
      },
    });
  });

  it('rejects empty field setting objects', () => {
    expect(() =>
      dataViewSpecSchema.validate({
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'logs-*',
        field_settings: {
          host_name: {},
        },
      })
    ).toThrow(/At least one of `format`, `custom_label`, or `custom_description` must be defined/);
  });
});
