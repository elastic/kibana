/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockGetDrilldownsSchema } from '@kbn/embeddable-plugin/server/mocks';
import { getVegaEmbeddableSchema } from './schema';

describe('Vega embeddable schema', () => {
  const schema = getVegaEmbeddableSchema(mockGetDrilldownsSchema);

  describe('spec safety', () => {
    it.each([
      ['a nested __proto__ key', '{ "mark": { "__proto__": { "polluted": true } } }'],
      ['a __proto__ key inside an array', '{ "layer": [{ "__proto__": { "polluted": true } }] }'],
      ['a constructor.prototype key', '{ "constructor": { "prototype": {} } }'],
      ['a nested constructor.prototype key', '{ "mark": { "constructor": { "prototype": {} } } }'],
    ])('rejects JSON specs with %s', (_, json) => {
      const result = schema.safeParse({ spec: { format: 'json', value: JSON.parse(json) } });

      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual([
        expect.objectContaining({
          path: ['spec', 'value'],
          message: expect.stringContaining('Invalid Vega spec'),
        }),
      ]);
    });

    it('drops a top-level __proto__ key from JSON specs', () => {
      const value = JSON.parse('{ "__proto__": { "polluted": true }, "mark": "point" }');
      const { spec } = schema.parse({ spec: { format: 'json', value } });

      expect(spec.value).toEqual({ mark: 'point' });
      expect(Object.keys(spec.value)).toEqual(['mark']);
      expect(Object.getPrototypeOf(spec.value)).toBe(Object.prototype);
    });

    it('accepts HJSON specs without inspecting them', () => {
      const spec = {
        format: 'hjson',
        value: '{\n  // the mark\n  mark: point\n  __proto__: { polluted: true }\n}',
      };

      expect(schema.parse({ spec }).spec).toEqual(spec);
    });

    it('accepts valid JSON specs unchanged', () => {
      const spec = {
        format: 'json',
        value: { mark: 'point', encoding: { x: { field: 'a' } }, data: { values: [{ a: 1 }] } },
      };

      expect(schema.parse({ spec }).spec).toEqual(spec);
    });
  });
});
