/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getSortingParams } from './sorting_params';

const MAPPINGS = {
  properties: {
    type: {
      type: 'text',
      fields: {
        raw: {
          type: 'keyword',
        },
      },
    },
    updated_at: {
      type: 'date',
    },
    pending: {
      properties: {
        title: {
          type: 'text',
          fields: {
            raw: {
              type: 'keyword',
            },
          },
        },
      },
    },
    saved: {
      properties: {
        title: {
          type: 'text',
          fields: {
            raw: {
              type: 'keyword',
            },
          },
        },
        obj: {
          properties: {
            key1: {
              type: 'text',
            },
          },
        },
      },
    },
  },
};

describe('searchDsl/getSortParams', () => {
  describe('errors', () => {
    it('throws an error when multiple types are used and a sort field is not a valid root property', () => {
      expect(() =>
        getSortingParams(MAPPINGS, ['saved', 'pending'], ['title'], [])
      ).toThrowErrorMatchingInlineSnapshot(
        `"Unable to sort multiple types by field title, not a root property"`
      );
    });

    it('throws an error a single type is used and a sort field is not a valid simple property', () => {
      expect(() =>
        getSortingParams(MAPPINGS, ['saved'], ['type'], [])
      ).toThrowErrorMatchingInlineSnapshot(`"Unknown sort field type"`);
      expect(() =>
        getSortingParams(MAPPINGS, ['saved'], ['foo'], [])
      ).toThrowErrorMatchingInlineSnapshot(`"Unknown sort field foo"`);
    });
  });

  describe('results', () => {
    it('returns an empty object when `sortFields` is empty', () => {
      expect(getSortingParams(MAPPINGS, 'pending', [], [])).toEqual({});
    });

    describe('top-level fields', () => {
      const type = 'saved'; // specific type doesn't matter for these test cases, it just needs to be valid

      it('single sort field without a sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, type, ['_id'], []);
        expect(sort).toEqual([{ _id: { order: undefined } }]);
      });

      it('single sort field with a single sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, type, ['_id'], ['foo']);
        expect(sort).toEqual([{ _id: { order: 'foo' } }]);
      });

      it('single sort field with multiple sort orders', () => {
        const { sort } = getSortingParams(MAPPINGS, type, ['_id'], ['foo', 'bar']);
        expect(sort).toEqual([{ _id: { order: 'foo' } }]);
      });

      it('multiple sort fields without a sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, type, ['_id', '_score'], []);
        expect(sort).toEqual([{ _id: { order: undefined } }, { _score: { order: undefined } }]);
      });

      it('multiple sort fields with a single sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, type, ['_id', '_score'], ['foo']);
        expect(sort).toEqual([{ _id: { order: 'foo' } }, { _score: { order: undefined } }]);
      });

      it('multiple sort fields with multiple sort orders', () => {
        const { sort } = getSortingParams(MAPPINGS, type, ['_id', '_score'], ['foo', 'bar']);
        expect(sort).toEqual([{ _id: { order: 'foo' } }, { _score: { order: 'bar' } }]);
      });
    });

    describe('root properties', () => {
      const types = ['saved', 'pending'];

      it('single sort field without a sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['type'], []);
        expect(sort).toEqual([{ type: { order: undefined, unmapped_type: 'text' } }]);
      });

      it('single sort field with a single sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['type'], ['foo']);
        expect(sort).toEqual([{ type: { order: 'foo', unmapped_type: 'text' } }]);
      });

      it('single sort field with multiple sort orders', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['type'], ['foo', 'bar']);
        expect(sort).toEqual([{ type: { order: 'foo', unmapped_type: 'text' } }]);
      });

      it('multiple sort fields without a sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['type', 'updated_at'], []);
        expect(sort).toEqual([
          { type: { order: undefined, unmapped_type: 'text' } },
          { updated_at: { order: undefined, unmapped_type: 'date' } },
        ]);
      });

      it('multiple sort fields with a single sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['type', 'updated_at'], ['foo']);
        expect(sort).toEqual([
          { type: { order: 'foo', unmapped_type: 'text' } },
          { updated_at: { order: undefined, unmapped_type: 'date' } },
        ]);
      });

      it('multiple sort fields with multiple sort orders', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['type', 'updated_at'], ['foo', 'bar']);
        expect(sort).toEqual([
          { type: { order: 'foo', unmapped_type: 'text' } },
          { updated_at: { order: 'bar', unmapped_type: 'date' } },
        ]);
      });
    });

    describe('simple properties', () => {
      const types = 'saved';

      it('single sort field without a sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['title'], []);
        expect(sort).toEqual([{ ['saved.title']: { order: undefined, unmapped_type: 'text' } }]);
      });

      it('single sort field with a single sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['title'], ['foo']);
        expect(sort).toEqual([{ ['saved.title']: { order: 'foo', unmapped_type: 'text' } }]);
      });

      it('single sort field with multiple sort orders', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['title'], ['foo', 'bar']);
        expect(sort).toEqual([{ ['saved.title']: { order: 'foo', unmapped_type: 'text' } }]);
      });

      it('multiple sort fields without a sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['title', 'obj.key1'], []);
        expect(sort).toEqual([
          { ['saved.title']: { order: undefined, unmapped_type: 'text' } },
          { ['saved.obj.key1']: { order: undefined, unmapped_type: 'text' } },
        ]);
      });

      it('multiple sort fields with a single sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['title', 'obj.key1'], ['foo']);
        expect(sort).toEqual([
          { ['saved.title']: { order: 'foo', unmapped_type: 'text' } },
          { ['saved.obj.key1']: { order: undefined, unmapped_type: 'text' } },
        ]);
      });

      it('multiple sort fields with multiple sort orders', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['title', 'obj.key1'], ['foo', 'bar']);
        expect(sort).toEqual([
          { ['saved.title']: { order: 'foo', unmapped_type: 'text' } },
          { ['saved.obj.key1']: { order: 'bar', unmapped_type: 'text' } },
        ]);
      });
    });

    describe('mixed properties, single type', () => {
      const type = 'saved';

      it('without a sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, type, ['_id', 'title'], []);
        expect(sort).toEqual([
          { _id: { order: undefined } },
          { ['saved.title']: { order: undefined, unmapped_type: 'text' } },
        ]);
      });

      it('with multiple sort orders', () => {
        const { sort } = getSortingParams(MAPPINGS, type, ['_id', 'title'], ['foo', 'bar']);
        expect(sort).toEqual([
          { _id: { order: 'foo' } },
          { ['saved.title']: { order: 'bar', unmapped_type: 'text' } },
        ]);
      });
    });

    describe('mixed properties, multiple types', () => {
      const types = ['saved', 'pending'];

      it('without a sort order', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['_id', 'type'], []);
        expect(sort).toEqual([
          { _id: { order: undefined } },
          { type: { order: undefined, unmapped_type: 'text' } },
        ]);
      });

      it('with multiple sort orders', () => {
        const { sort } = getSortingParams(MAPPINGS, types, ['_id', 'type'], ['foo', 'bar']);
        expect(sort).toEqual([
          { _id: { order: 'foo' } },
          { type: { order: 'bar', unmapped_type: 'text' } },
        ]);
      });
    });
  });
});
