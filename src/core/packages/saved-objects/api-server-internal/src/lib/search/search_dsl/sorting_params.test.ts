/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSortingParams, MAX_FIND_SORT_FIELDS } from './sorting_params';

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
} as const;

describe('searchDsl/getSortParams', () => {
  describe('type, no sortField', () => {
    it('returns no params', () => {
      expect(getSortingParams(MAPPINGS, 'pending')).toEqual({});
    });
  });

  describe('type, order, no sortField', () => {
    it('returns no params', () => {
      expect(getSortingParams(MAPPINGS, 'saved', undefined, 'desc')).toEqual({});
    });
  });

  describe('sortField no direction', () => {
    describe('sortField is simple property with single type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title')).toEqual({
          sort: [
            {
              'saved.title': {
                order: undefined,
                unmapped_type: 'text',
              },
            },
          ],
        });
      });
    });
    describe('sortField is simple root property with multiple types', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type')).toEqual({
          sort: [
            {
              type: {
                order: undefined,
                unmapped_type: 'text',
              },
            },
          ],
        });
      });
    });
    describe('sortField is simple non-root property with multiple types', () => {
      it('returns correct params', () => {
        expect(() =>
          getSortingParams(MAPPINGS, ['saved', 'pending'], 'title')
        ).toThrowErrorMatchingSnapshot();
      });
    });
    describe('sortField is multi-field with single type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title.raw')).toEqual({
          sort: [
            {
              'saved.title.raw': {
                order: undefined,
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });
    });
    describe('sortField is multi-field with single type as array', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved'], 'title.raw')).toEqual({
          sort: [
            {
              'saved.title.raw': {
                order: undefined,
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });
    });
    describe('sortField is root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type.raw')).toEqual({
          sort: [
            {
              'type.raw': {
                order: undefined,
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });
    });
    describe('sortField is not-root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(() =>
          getSortingParams(MAPPINGS, ['saved', 'pending'], 'title.raw')
        ).toThrowErrorMatchingSnapshot();
      });
    });
  });

  describe('sort with direction', () => {
    describe('sortField is simple property with single type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title', 'desc')).toEqual({
          sort: [
            {
              'saved.title': {
                order: 'desc',
                unmapped_type: 'text',
              },
            },
          ],
        });
      });
    });
    describe('sortField is root simple property with single type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved'], 'type', 'desc')).toEqual({
          sort: [
            {
              type: {
                order: 'desc',
                unmapped_type: 'text',
              },
            },
          ],
        });
      });
    });
    describe('sortField is root simple property with multiple type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type', 'desc')).toEqual({
          sort: [
            {
              type: {
                order: 'desc',
                unmapped_type: 'text',
              },
            },
          ],
        });
      });
    });
    describe('sortFields is non-root simple property with multiple types', () => {
      it('returns correct params', () => {
        expect(() =>
          getSortingParams(MAPPINGS, ['saved', 'pending'], 'title', 'desc')
        ).toThrowErrorMatchingSnapshot();
      });
    });
    describe('sortField is multi-field with single type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title.raw', 'asc')).toEqual({
          sort: [
            {
              'saved.title.raw': {
                order: 'asc',
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });
    });
    describe('sortField is root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type.raw', 'asc')).toEqual({
          sort: [
            {
              'type.raw': {
                order: 'asc',
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });
    });
    describe('sortField is non-root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(() =>
          getSortingParams(MAPPINGS, ['saved', 'pending'], 'title.raw', 'asc')
        ).toThrowErrorMatchingSnapshot();
      });
    });
  });

  describe('pit, no sortField', () => {
    it('defaults to natural storage order sorting', () => {
      expect(getSortingParams(MAPPINGS, 'saved', undefined, undefined, { id: 'abc123' })).toEqual({
        sort: ['_shard_doc'],
      });
    });
  });

  describe('sort array', () => {
    it('sorts by several fields and uses _shard_doc as a tiebreaker inside a point in time', () => {
      expect(
        getSortingParams(MAPPINGS, 'saved', undefined, undefined, { id: 'abc123' }, [
          { field: 'title', order: 'desc' },
          { field: '_shard_doc', order: 'asc' },
        ])
      ).toEqual({
        sort: [
          {
            'saved.title': {
              order: 'desc',
              unmapped_type: 'text',
            },
          },
          {
            _shard_doc: {
              order: 'asc',
            },
          },
        ],
      });
    });

    it('resolves each field on its own when sorting multiple types', () => {
      expect(
        getSortingParams(MAPPINGS, ['saved', 'pending'], undefined, undefined, undefined, [
          { field: 'type', order: 'asc' },
          { field: '_score', order: 'desc' },
        ])
      ).toEqual({
        sort: [
          {
            type: {
              order: 'asc',
              unmapped_type: 'text',
            },
          },
          {
            _score: {
              order: 'desc',
            },
          },
        ],
      });
    });

    it('matches a single sortField when the list has one entry', () => {
      expect(
        getSortingParams(MAPPINGS, 'saved', undefined, undefined, undefined, [
          { field: 'title', order: 'desc' },
        ])
      ).toEqual(getSortingParams(MAPPINGS, 'saved', 'title', 'desc'));
    });

    it('treats an empty list as no sort', () => {
      expect(getSortingParams(MAPPINGS, 'saved', undefined, undefined, undefined, [])).toEqual({});
      expect(
        getSortingParams(MAPPINGS, 'saved', undefined, undefined, { id: 'abc123' }, [])
      ).toEqual({
        sort: ['_shard_doc'],
      });
    });

    it('rejects a tiebreaker that is not a root field when sorting multiple types', () => {
      expect(() =>
        getSortingParams(MAPPINGS, ['saved', 'pending'], undefined, undefined, undefined, [
          { field: 'type', order: 'asc' },
          { field: 'title', order: 'asc' },
        ])
      ).toThrowError(/Unable to sort multiple types by field title/);
    });

    it('rejects an unknown field in the list', () => {
      expect(() =>
        getSortingParams(MAPPINGS, 'saved', undefined, undefined, undefined, [
          { field: 'title', order: 'asc' },
          { field: 'missing', order: 'asc' },
        ])
      ).toThrowError(/Unknown sort field missing/);
    });

    it('rejects a duplicate field', () => {
      expect(() =>
        getSortingParams(MAPPINGS, 'saved', undefined, undefined, undefined, [
          { field: 'title', order: 'asc' },
          { field: 'title', order: 'desc' },
        ])
      ).toThrowError(/Duplicate sort field title/);
    });

    it('rejects an empty field name', () => {
      expect(() =>
        getSortingParams(MAPPINGS, 'saved', undefined, undefined, undefined, [
          { field: '', order: 'asc' },
        ])
      ).toThrowError(/non-empty field/);
    });

    it('rejects more than the maximum number of fields', () => {
      const overLimit = Array.from({ length: MAX_FIND_SORT_FIELDS + 1 }, (_, index) => ({
        field: `field_${index}`,
        order: 'asc' as const,
      }));

      expect(() =>
        getSortingParams(MAPPINGS, 'saved', undefined, undefined, undefined, overLimit)
      ).toThrowError(new RegExp(`more than ${MAX_FIND_SORT_FIELDS} fields`));
    });

    it('rejects combining sort with sortField or sortOrder', () => {
      expect(() =>
        getSortingParams(MAPPINGS, 'saved', 'title', undefined, undefined, [
          { field: 'type', order: 'asc' },
        ])
      ).toThrowError(/cannot be combined with sortField or sortOrder/);
      expect(() =>
        getSortingParams(MAPPINGS, 'saved', undefined, 'desc', undefined, [
          { field: 'type', order: 'asc' },
        ])
      ).toThrowError(/cannot be combined with sortField or sortOrder/);
    });

    it('rejects _id because Elasticsearch disables fielddata on it', () => {
      expect(() =>
        getSortingParams(MAPPINGS, 'saved', undefined, undefined, { id: 'abc123' }, [
          { field: 'title', order: 'desc' },
          { field: '_id', order: 'asc' },
        ])
      ).toThrowError(/Cannot sort by _id/);
      expect(() => getSortingParams(MAPPINGS, 'saved', '_id', 'asc')).toThrowError(
        /Cannot sort by _id/
      );
    });

    it('rejects _shard_doc unless a point in time is open', () => {
      expect(() =>
        getSortingParams(MAPPINGS, 'saved', undefined, undefined, undefined, [
          { field: '_shard_doc', order: 'asc' },
        ])
      ).toThrowError(/_shard_doc requires a point in time/);
      expect(() => getSortingParams(MAPPINGS, 'saved', '_shard_doc', 'asc')).toThrowError(
        /_shard_doc requires a point in time/
      );
    });
  });
});
