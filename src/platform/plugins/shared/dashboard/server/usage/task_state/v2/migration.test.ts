/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { upMigration } from './migration';

describe('upMigration', () => {
  it('should preserve existing v1 state and add empty access_mode field', () => {
    const v1State = {
      runs: 5,
      telemetry: {
        panels: {
          total: 10,
          by_reference: 5,
          by_value: 5,
          by_type: {
            lens: {
              total: 3,
              by_reference: 2,
              by_value: 1,
              details: {},
            },
          },
        },
        controls: {
          total: 2,
          chaining_system: { hierarchical: 1 },
          label_position: { inline: 2 },
          ignore_settings: {},
          by_type: { optionsListControl: 2 },
        },
        sections: {
          total: 1,
        },
      },
    };

    const result = upMigration(cloneDeep(v1State));

    expect(result).toEqual({
      ...v1State,
      telemetry: {
        ...v1State.telemetry,
        access_mode: {},
      },
    });
  });

  it('should preserve existing access mode value if already present', () => {
    const stateWithWriteRestricted = {
      runs: 3,
      telemetry: {
        panels: {
          total: 5,
          by_reference: 3,
          by_value: 2,
          by_type: {},
        },
        controls: {
          total: 0,
          chaining_system: {},
          label_position: {},
          ignore_settings: {},
          by_type: {},
        },
        sections: {
          total: 0,
        },
        access_mode: {
          write_restricted: {
            total: 7,
          },
          default: {
            total: 15,
          },
        },
      },
    };

    const result = upMigration(cloneDeep(stateWithWriteRestricted));

    expect(result.telemetry.access_mode.write_restricted.total).toBe(7);
    expect(result.telemetry.access_mode.default.total).toBe(15);
  });
});
