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
  it('should omit deprecated props from controls telemetry', () => {
    const v2State = {
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
        access_mode: {},
      },
    };

    const result = upMigration(cloneDeep(v2State));

    expect(result).toEqual({
      ...v2State,
      telemetry: {
        ...v2State.telemetry,
        controls: {
          total: 2,
          by_type: { optionsListControl: 2 },
        },
      },
    });
  });
});
