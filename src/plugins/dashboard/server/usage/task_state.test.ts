/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { stateSchemaByVersion } from './task_state';

describe('telemetry task state', () => {
  describe('v1', () => {
    const v1 = stateSchemaByVersion[1];
    it('should work on empty object when running the up migration', () => {
      const result = v1.up({});
      expect(result).toMatchInlineSnapshot(`
        Object {
          "runs": 0,
          "telemetry": Object {
            "controls": Object {
              "by_type": Object {},
              "chaining_system": Object {},
              "ignore_settings": Object {},
              "label_position": Object {},
              "total": 0,
            },
            "panels": Object {
              "by_reference": 0,
              "by_type": Object {},
              "by_value": 0,
              "total": 0,
            },
          },
        }
      `);
    });

    it(`shouldn't overwrite properties when running the up migration`, () => {
      const state = {
        runs: 1,
        telemetry: {
          panels: {
            total: 2,
            by_reference: 3,
            by_value: 4,
            by_type: {
              foo: 5,
            },
          },
          controls: {
            total: 6,
            chaining_system: { foo: 7 },
            label_position: { foo: 8 },
            ignore_settings: { foo: 9 },
            by_type: { foo: 10 },
          },
        },
      };
      const result = v1.up(cloneDeep(state));
      expect(result).toEqual(state);
    });

    it(`should migrate the old default state that didn't match the schema`, () => {
      const result = v1.up({ byDate: {}, suggestionsByDate: {}, saved: {}, runs: 0 });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "runs": 0,
          "telemetry": Object {
            "controls": Object {
              "by_type": Object {},
              "chaining_system": Object {},
              "ignore_settings": Object {},
              "label_position": Object {},
              "total": 0,
            },
            "panels": Object {
              "by_reference": 0,
              "by_type": Object {},
              "by_value": 0,
              "total": 0,
            },
          },
        }
      `);
    });

    it('should drop unknown properties when running the up migration', () => {
      const state = { foo: true };
      const result = v1.up(state);
      expect(result).not.toHaveProperty('foo');
    });
  });
});
