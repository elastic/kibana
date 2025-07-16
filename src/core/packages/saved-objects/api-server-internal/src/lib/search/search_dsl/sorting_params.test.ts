/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    numeric: {
      properties: {
        count: {
          type: 'long',
        },
        price: {
          type: 'float',
        },
        created: {
          type: 'date',
        },
      },
    },
    mixed: {
      properties: {
        count: {
          type: 'float',
        },
        created: {
          type: 'date',
        },
        price: {
          type: 'float',
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
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'title')).toEqual({
          runtime_mappings: {
            merged_title: {
              script: {
                source:
                  "if (doc.containsKey('saved.title.raw') && doc['saved.title.raw'].size() != 0) { emit(doc['saved.title.raw'].value); } else if (doc.containsKey('pending.title.raw') && doc['pending.title.raw'].size() != 0) { emit(doc['pending.title.raw'].value); } else { emit(\"\"); }",
              },
              type: 'keyword',
            },
          },
          sort: [{ merged_title: { order: undefined } }],
        });
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
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'title.raw')).toEqual({
          runtime_mappings: {
            'merged_title.raw': {
              script: {
                source:
                  "if (doc.containsKey('saved.title.raw') && doc['saved.title.raw'].size() != 0) { emit(doc['saved.title.raw'].value); } else if (doc.containsKey('pending.title.raw') && doc['pending.title.raw'].size() != 0) { emit(doc['pending.title.raw'].value); } else { emit(\"\"); }",
              },
              type: 'keyword',
            },
          },
          sort: [
            {
              'merged_title.raw': { order: undefined },
            },
          ],
        });
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
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'title', 'desc')).toEqual({
          runtime_mappings: {
            merged_title: {
              script: {
                source:
                  "if (doc.containsKey('saved.title.raw') && doc['saved.title.raw'].size() != 0) { emit(doc['saved.title.raw'].value); } else if (doc.containsKey('pending.title.raw') && doc['pending.title.raw'].size() != 0) { emit(doc['pending.title.raw'].value); } else { emit(\"\"); }",
              },
              type: 'keyword',
            },
          },
          sort: [
            {
              merged_title: {
                order: 'desc',
              },
            },
          ],
        });
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
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'title.raw', 'asc')).toEqual({
          runtime_mappings: {
            'merged_title.raw': {
              script: {
                source:
                  "if (doc.containsKey('saved.title.raw') && doc['saved.title.raw'].size() != 0) { emit(doc['saved.title.raw'].value); } else if (doc.containsKey('pending.title.raw') && doc['pending.title.raw'].size() != 0) { emit(doc['pending.title.raw'].value); } else { emit(\"\"); }",
              },
              type: 'keyword',
            },
          },
          sort: [
            {
              'merged_title.raw': { order: 'asc' },
            },
          ],
        });
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

  describe('runtime field type detection', () => {
    it('normalizes long fields to double type', () => {
      expect(getSortingParams(MAPPINGS, ['numeric', 'numeric'], 'count')).toEqual({
        runtime_mappings: {
          merged_count: {
            script: {
              source:
                "if (doc.containsKey('numeric.count') && doc['numeric.count'].size() != 0) { emit(doc['numeric.count'].value); } else if (doc.containsKey('numeric.count') && doc['numeric.count'].size() != 0) { emit(doc['numeric.count'].value); }",
            },
            type: 'double',
          },
        },
        sort: [{ merged_count: { order: undefined } }],
      });
    });

    it('normalizes float fields to double type', () => {
      expect(getSortingParams(MAPPINGS, ['numeric', 'mixed'], 'price')).toEqual({
        runtime_mappings: {
          merged_price: {
            script: {
              source:
                "if (doc.containsKey('numeric.price') && doc['numeric.price'].size() != 0) { emit(doc['numeric.price'].value); } else if (doc.containsKey('mixed.price') && doc['mixed.price'].size() != 0) { emit(doc['mixed.price'].value); }",
            },
            type: 'double',
          },
        },
        sort: [{ merged_price: { order: undefined } }],
      });
    });

    it('preserves date type without normalization', () => {
      expect(getSortingParams(MAPPINGS, ['numeric', 'mixed'], 'created')).toEqual({
        runtime_mappings: {
          merged_created: {
            script: {
              source:
                "if (doc.containsKey('numeric.created') && doc['numeric.created'].size() != 0) { emit(doc['numeric.created'].value); } else if (doc.containsKey('mixed.created') && doc['mixed.created'].size() != 0) { emit(doc['mixed.created'].value); }",
            },
            type: 'date',
          },
        },
        sort: [{ merged_created: { order: undefined } }],
      });
    });

    it('uses keyword for text fields with keyword subfield type', () => {
      expect(getSortingParams(MAPPINGS, ['pending', 'saved'], 'title')).toEqual({
        runtime_mappings: {
          merged_title: {
            script: {
              source:
                "if (doc.containsKey('pending.title.raw') && doc['pending.title.raw'].size() != 0) { emit(doc['pending.title.raw'].value); } else if (doc.containsKey('saved.title.raw') && doc['saved.title.raw'].size() != 0) { emit(doc['saved.title.raw'].value); } else { emit(\"\"); }",
            },
            type: 'keyword',
          },
        },
        sort: [{ merged_title: { order: undefined } }],
      });
    });

    it('throws error when normalized field types are incompatible across types', () => {
      // Add a new mapping with a different type for 'count'
      const MAPPINGS_WITH_MISMATCH = {
        ...MAPPINGS,
        properties: {
          ...MAPPINGS.properties,
          mismatch: {
            properties: {
              count: {
                type: 'keyword',
              },
            },
          },
        },
      } as const;

      expect(() =>
        getSortingParams(MAPPINGS_WITH_MISMATCH, ['numeric', 'mismatch'], 'count')
      ).toThrow(
        'Sort field "count" has incompatible types across saved object types: [double, keyword]. All field types must be compatible for sorting (numeric types are considered equivalent).'
      );
    });

    it('throws error when sort field is of type text without keyword subfield', () => {
      // This test demonstrates that we explicitly reject text fields without keyword subfields.
      // If we allowed this, it would create dangerous inconsistent behavior:
      // - Single type: would fail at query time (cannot sort on text directly)
      // - Multi type: could work with runtime fields but would be confusing

      // Add a mapping with text field without keyword subfield
      const MAPPINGS_WITH_TEXT_ONLY = {
        ...MAPPINGS,
        properties: {
          ...MAPPINGS.properties,
          textonly: {
            properties: {
              description: {
                type: 'text', // No keyword subfield
              },
            },
          },
          saved: {
            ...MAPPINGS.properties.saved,
            properties: {
              ...MAPPINGS.properties.saved.properties,
              description: {
                type: 'text', // No keyword subfield in saved type either
              },
            },
          },
        },
      } as const;

      expect(() =>
        getSortingParams(MAPPINGS_WITH_TEXT_ONLY, ['textonly', 'saved'], 'description')
      ).toThrow(
        'Sort field "textonly.description" is of type "text" which is not sortable. Sorting on text fields requires a "keyword" subfield.'
      );
    });
  });
});
