/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RUNTIME_FIELD_COMPOSITE_TYPE } from '@kbn/data-views-plugin/common';
import { savedDataViewSpecSchema } from './schema_saved_data_view';

describe('savedDataViewSpecSchema', () => {
  it('accepts a minimal spec', () => {
    const input = {
      index_pattern: 'logs-*',
    };

    expect(savedDataViewSpecSchema.validate(input)).toEqual(input);
  });

  it('accepts indexed field overrides with popularity', () => {
    const input = {
      index_pattern: 'logs-*',
      time_field: '@timestamp',
      field_settings: {
        bytes_field: {
          popularity: 10,
          format: { type: 'bytes', params: { pattern: '0,0.[000]b' } },
        },
        host_name: {
          popularity: 0,
          custom_label: 'Host',
          custom_description: 'Hostname field',
        },
      },
    };

    expect(savedDataViewSpecSchema.validate(input)).toEqual(input);
  });

  it('accepts primitive and composite runtime definitions with popularity', () => {
    const input = {
      index_pattern: 'kibana_sample_data_logs',
      time_field: '@timestamp',
      field_settings: {
        foo: {
          type: 'keyword' as const,
          script: 'some script',
          popularity: 10,
        },
        bar: {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          script: "emit('a', 'hello');",
          fields: {
            a: {
              type: 'keyword' as const,
              popularity: 10,
            },
          },
        },
      },
    };

    expect(savedDataViewSpecSchema.validate(input)).toEqual(input);
  });

  it('rejects popularity below 0 for indexed field overrides', () => {
    const input = {
      index_pattern: 'logs-*',
      field_settings: {
        bytes_field: {
          popularity: -1,
        },
      },
    };

    expect(() => savedDataViewSpecSchema.validate(input)).toThrow(
      /popularity\]: Value must be equal to or greater than \[0\]/i
    );
  });

  it('rejects an empty field_settings key', () => {
    const input = {
      index_pattern: 'logs-*',
      field_settings: {
        '': { popularity: 0 },
      },
    };

    expect(() => savedDataViewSpecSchema.validate(input)).toThrow(/key\(""\)/);
  });
});
