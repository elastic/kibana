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
    root_field: {
      type: 'text',
      fields: {
        raw: {
          type: 'keyword',
        },
      },
    },
    secondary_type: {
      properties: {
        title: {
          type: 'text',
          fields: {
            raw: {
              type: 'keyword',
            },
          },
        },
        status: {
          type: 'boolean',
        },
      },
    },
    primary_type: {
      properties: {
        title: {
          type: 'text',
          fields: {
            raw: {
              type: 'keyword',
            },
          },
        },
        status: {
          type: 'boolean',
        },
        description: {
          type: 'text', // No keyword subfield
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
        integer_field: {
          type: 'integer',
        },
        short_field: {
          type: 'short',
        },
        byte_field: {
          type: 'byte',
        },
        double_field: {
          type: 'double',
        },
      },
    },
    numeric_compatable: {
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
        integer_field: {
          type: 'integer',
        },
        short_field: {
          type: 'short',
        },
        byte_field: {
          type: 'byte',
        },
        double_field: {
          type: 'double',
        },
      },
    },
    textonly: {
      properties: {
        description: {
          type: 'text', // No keyword subfield
        },
      },
    },
    numeric_incompatible: {
      properties: {
        count: {
          type: 'keyword',
        },
      },
    },
  },
} as const;

describe('getSortingParams', () => {
  describe('no sort field specified', () => {
    it('returns empty params for single type', () => {
      expect(getSortingParams(MAPPINGS, 'secondary_type')).toEqual({});
    });

    it('returns empty params for multiple types', () => {
      expect(getSortingParams(MAPPINGS, ['primary_type', 'secondary_type'])).toEqual({});
    });

    it('returns empty params when order is specified but no sort field', () => {
      expect(getSortingParams(MAPPINGS, 'primary_type', undefined, 'desc')).toEqual({});
    });

    it('defaults to shard_doc sorting when PIT is provided', () => {
      expect(
        getSortingParams(MAPPINGS, 'primary_type', undefined, undefined, { id: 'abc123' })
      ).toEqual({
        sort: ['_shard_doc'],
      });
    });
  });

  describe('single type sorting', () => {
    it('sorts by text field directly', () => {
      expect(getSortingParams(MAPPINGS, 'primary_type', 'title')).toEqual({
        sort: [
          {
            'primary_type.title': {
              order: undefined,
              unmapped_type: 'text',
            },
          },
        ],
      });
    });

    it('sorts by keyword subfield', () => {
      expect(getSortingParams(MAPPINGS, 'primary_type', 'title.raw')).toEqual({
        sort: [
          {
            'primary_type.title.raw': {
              order: undefined,
              unmapped_type: 'keyword',
            },
          },
        ],
      });
    });

    it('sorts by numeric field', () => {
      expect(getSortingParams(MAPPINGS, 'numeric', 'count')).toEqual({
        sort: [
          {
            'numeric.count': {
              order: undefined,
              unmapped_type: 'long',
            },
          },
        ],
      });
    });

    it('sorts by date field', () => {
      expect(getSortingParams(MAPPINGS, 'numeric', 'created')).toEqual({
        sort: [
          {
            'numeric.created': {
              order: undefined,
              unmapped_type: 'date',
            },
          },
        ],
      });
    });

    it('sorts by boolean field', () => {
      expect(getSortingParams(MAPPINGS, 'primary_type', 'status')).toEqual({
        sort: [
          {
            'primary_type.status': {
              order: undefined,
              unmapped_type: 'boolean',
            },
          },
        ],
      });
    });

    it('sorts by root field', () => {
      expect(getSortingParams(MAPPINGS, 'primary_type', 'root_field')).toEqual({
        sort: [
          {
            root_field: {
              order: undefined,
              unmapped_type: 'text',
            },
          },
        ],
      });
    });

    describe('type-specific fields', () => {
      it('sorts explicitly on keyword subfields', () => {
        expect(getSortingParams(MAPPINGS, 'primary_type', 'title.raw')).toEqual({
          sort: [
            {
              'primary_type.title.raw': {
                order: undefined,
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });

      it('handles single type as array', () => {
        expect(getSortingParams(MAPPINGS, ['primary_type'], 'title.raw')).toEqual({
          sort: [
            {
              'primary_type.title.raw': {
                order: undefined,
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });

      it('throws error for unknown sort field', () => {
        expect(() => getSortingParams(MAPPINGS, 'primary_type', 'unknown')).toThrow(
          'Unknown sort field unknown'
        );
      });
    });

    describe('sort order variations', () => {
      it('applies ascending order correctly', () => {
        expect(getSortingParams(MAPPINGS, 'primary_type', 'title.raw', 'asc')).toEqual({
          sort: [
            {
              'primary_type.title.raw': {
                order: 'asc',
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });

      it('applies descending order correctly', () => {
        expect(getSortingParams(MAPPINGS, 'numeric', 'count', 'desc')).toEqual({
          sort: [
            {
              'numeric.count': {
                order: 'desc',
                unmapped_type: 'long',
              },
            },
          ],
        });
      });

      it('defaults to undefined order when not specified', () => {
        expect(getSortingParams(MAPPINGS, 'primary_type', 'status')).toEqual({
          sort: [
            {
              'primary_type.status': {
                order: undefined,
                unmapped_type: 'boolean',
              },
            },
          ],
        });
      });

      it('applies order to root field', () => {
        expect(getSortingParams(MAPPINGS, 'primary_type', 'root_field', 'asc')).toEqual({
          sort: [
            {
              root_field: {
                order: 'asc',
                unmapped_type: 'text',
              },
            },
          ],
        });
      });

      it('applies order to date field', () => {
        expect(getSortingParams(MAPPINGS, 'numeric', 'created', 'desc')).toEqual({
          sort: [
            {
              'numeric.created': {
                order: 'desc',
                unmapped_type: 'date',
              },
            },
          ],
        });
      });
    });
  });

  describe('multi-type sorting', () => {
    describe('root fields', () => {
      it('sorts by shared root text field', () => {
        expect(
          getSortingParams(MAPPINGS, ['primary_type', 'secondary_type'], 'root_field')
        ).toEqual({
          sort: [
            {
              root_field: {
                order: undefined,
                unmapped_type: 'text',
              },
            },
          ],
        });
      });

      it('sorts by shared root keyword subfield', () => {
        expect(
          getSortingParams(MAPPINGS, ['primary_type', 'secondary_type'], 'root_field.raw')
        ).toEqual({
          sort: [
            {
              'root_field.raw': {
                order: undefined,
                unmapped_type: 'keyword',
              },
            },
          ],
        });
      });
    });

    describe('type-specific fields', () => {
      it('creates runtime mapping for keyword subfields', () => {
        expect(getSortingParams(MAPPINGS, ['primary_type', 'secondary_type'], 'title.raw')).toEqual(
          {
            runtime_mappings: {
              'merged_title.raw': {
                script: {
                  source:
                    "if (doc.containsKey('primary_type.title.raw') && doc['primary_type.title.raw'].size() != 0) { emit(doc['primary_type.title.raw'].value); } else if (doc.containsKey('secondary_type.title.raw') && doc['secondary_type.title.raw'].size() != 0) { emit(doc['secondary_type.title.raw'].value); } else { emit(\"\"); }",
                },
                type: 'keyword',
              },
            },
            sort: [{ 'merged_title.raw': { order: undefined } }],
          }
        );
      });

      it('sorts explicitly on keyword subfields', () => {
        expect(getSortingParams(MAPPINGS, ['secondary_type', 'primary_type'], 'title.raw')).toEqual(
          {
            runtime_mappings: {
              'merged_title.raw': {
                script: {
                  source:
                    "if (doc.containsKey('secondary_type.title.raw') && doc['secondary_type.title.raw'].size() != 0) { emit(doc['secondary_type.title.raw'].value); } else if (doc.containsKey('primary_type.title.raw') && doc['primary_type.title.raw'].size() != 0) { emit(doc['primary_type.title.raw'].value); } else { emit(\"\"); }",
                },
                type: 'keyword',
              },
            },
            sort: [{ 'merged_title.raw': { order: undefined } }],
          }
        );
      });

      it('throws error for text fields', () => {
        expect(() =>
          getSortingParams(MAPPINGS, ['primary_type', 'secondary_type'], 'title')
        ).toThrowErrorMatchingInlineSnapshot(
          `"Sort field \\"primary_type.title\\" is of type \\"text\\" which is not sortable. If the field has a sortable subfield e.g \\"keyword\\" subfield, use \\"field.keyword\\" for sorting."`
        );
      });

      it('throws error for fields not present in all types', () => {
        expect(() => getSortingParams(MAPPINGS, ['primary_type', 'numeric'], 'title')).toThrow(
          'Sort field "title" must be present in all types to use in sorting when multiple types are specified.'
        );
      });
    });

    describe('field type handling', () => {
      it('normalizes long to double type', () => {
        expect(getSortingParams(MAPPINGS, ['numeric', 'numeric_compatable'], 'count')).toEqual({
          runtime_mappings: {
            merged_count: {
              script: {
                source:
                  "if (doc.containsKey('numeric.count') && doc['numeric.count'].size() != 0) { emit(doc['numeric.count'].value); } else if (doc.containsKey('numeric_compatable.count') && doc['numeric_compatable.count'].size() != 0) { emit(doc['numeric_compatable.count'].value); }",
              },
              type: 'double',
            },
          },
          sort: [{ merged_count: { order: undefined } }],
        });
      });

      it('normalizes float to double type', () => {
        expect(getSortingParams(MAPPINGS, ['numeric', 'numeric_compatable'], 'price')).toEqual({
          runtime_mappings: {
            merged_price: {
              script: {
                source:
                  "if (doc.containsKey('numeric.price') && doc['numeric.price'].size() != 0) { emit(doc['numeric.price'].value); } else if (doc.containsKey('numeric_compatable.price') && doc['numeric_compatable.price'].size() != 0) { emit(doc['numeric_compatable.price'].value); }",
              },
              type: 'double',
            },
          },
          sort: [{ merged_price: { order: undefined } }],
        });
      });

      it('normalizes integer to double type', () => {
        expect(
          getSortingParams(MAPPINGS, ['numeric', 'numeric_compatable'], 'integer_field')
        ).toEqual({
          runtime_mappings: {
            merged_integer_field: {
              script: {
                source:
                  "if (doc.containsKey('numeric.integer_field') && doc['numeric.integer_field'].size() != 0) { emit(doc['numeric.integer_field'].value); } else if (doc.containsKey('numeric_compatable.integer_field') && doc['numeric_compatable.integer_field'].size() != 0) { emit(doc['numeric_compatable.integer_field'].value); }",
              },
              type: 'double',
            },
          },
          sort: [{ merged_integer_field: { order: undefined } }],
        });
      });

      it('normalizes short to double type', () => {
        expect(
          getSortingParams(MAPPINGS, ['numeric', 'numeric_compatable'], 'short_field')
        ).toEqual({
          runtime_mappings: {
            merged_short_field: {
              script: {
                source:
                  "if (doc.containsKey('numeric.short_field') && doc['numeric.short_field'].size() != 0) { emit(doc['numeric.short_field'].value); } else if (doc.containsKey('numeric_compatable.short_field') && doc['numeric_compatable.short_field'].size() != 0) { emit(doc['numeric_compatable.short_field'].value); }",
              },
              type: 'double',
            },
          },
          sort: [{ merged_short_field: { order: undefined } }],
        });
      });

      it('normalizes byte to double type', () => {
        expect(getSortingParams(MAPPINGS, ['numeric', 'numeric_compatable'], 'byte_field')).toEqual(
          {
            runtime_mappings: {
              merged_byte_field: {
                script: {
                  source:
                    "if (doc.containsKey('numeric.byte_field') && doc['numeric.byte_field'].size() != 0) { emit(doc['numeric.byte_field'].value); } else if (doc.containsKey('numeric_compatable.byte_field') && doc['numeric_compatable.byte_field'].size() != 0) { emit(doc['numeric_compatable.byte_field'].value); }",
                },
                type: 'double',
              },
            },
            sort: [{ merged_byte_field: { order: undefined } }],
          }
        );
      });

      it('normalizes double to double type', () => {
        expect(
          getSortingParams(MAPPINGS, ['numeric', 'numeric_compatable'], 'double_field')
        ).toEqual({
          runtime_mappings: {
            merged_double_field: {
              script: {
                source:
                  "if (doc.containsKey('numeric.double_field') && doc['numeric.double_field'].size() != 0) { emit(doc['numeric.double_field'].value); } else if (doc.containsKey('numeric_compatable.double_field') && doc['numeric_compatable.double_field'].size() != 0) { emit(doc['numeric_compatable.double_field'].value); }",
              },
              type: 'double',
            },
          },
          sort: [{ merged_double_field: { order: undefined } }],
        });
      });

      it('preserves date type unchanged', () => {
        expect(getSortingParams(MAPPINGS, ['numeric', 'numeric_compatable'], 'created')).toEqual({
          runtime_mappings: {
            merged_created: {
              script: {
                source:
                  "if (doc.containsKey('numeric.created') && doc['numeric.created'].size() != 0) { emit(doc['numeric.created'].value); } else if (doc.containsKey('numeric_compatable.created') && doc['numeric_compatable.created'].size() != 0) { emit(doc['numeric_compatable.created'].value); }",
              },
              type: 'date',
            },
          },
          sort: [{ merged_created: { order: undefined } }],
        });
      });

      it('preserves keyword type unchanged', () => {
        expect(getSortingParams(MAPPINGS, ['primary_type', 'secondary_type'], 'title.raw')).toEqual(
          {
            runtime_mappings: {
              'merged_title.raw': {
                script: {
                  source:
                    "if (doc.containsKey('primary_type.title.raw') && doc['primary_type.title.raw'].size() != 0) { emit(doc['primary_type.title.raw'].value); } else if (doc.containsKey('secondary_type.title.raw') && doc['secondary_type.title.raw'].size() != 0) { emit(doc['secondary_type.title.raw'].value); } else { emit(\"\"); }",
                },
                type: 'keyword',
              },
            },
            sort: [{ 'merged_title.raw': { order: undefined } }],
          }
        );
      });

      it('preserves boolean type unchanged', () => {
        expect(getSortingParams(MAPPINGS, ['primary_type', 'secondary_type'], 'status')).toEqual({
          runtime_mappings: {
            merged_status: {
              script: {
                source:
                  "if (doc.containsKey('primary_type.status') && doc['primary_type.status'].size() != 0) { emit(doc['primary_type.status'].value); } else if (doc.containsKey('secondary_type.status') && doc['secondary_type.status'].size() != 0) { emit(doc['secondary_type.status'].value); }",
              },
              type: 'boolean',
            },
          },
          sort: [{ merged_status: { order: undefined } }],
        });
      });
    });

    describe('error scenarios', () => {
      it('throws error for text fields', () => {
        expect(() =>
          getSortingParams(MAPPINGS, ['textonly', 'primary_type'], 'description')
        ).toThrowErrorMatchingInlineSnapshot(
          `"Sort field \\"textonly.description\\" is of type \\"text\\" which is not sortable. If the field has a sortable subfield e.g \\"keyword\\" subfield, use \\"field.keyword\\" for sorting."`
        );
      });

      it('throws error for incompatible types across saved object types', () => {
        expect(() =>
          getSortingParams(MAPPINGS, ['numeric', 'numeric_incompatible'], 'count')
        ).toThrowErrorMatchingInlineSnapshot(
          `"Sort field \\"count\\" has incompatible types across saved object types: [double, keyword]. All field types must be compatible for sorting (numeric types are considered equivalent)."`
        );
      });

      it('throws error for unsupported field types in multi-type queries', () => {
        const MAPPINGS_WITH_UNSUPPORTED = {
          ...MAPPINGS,
          properties: {
            ...MAPPINGS.properties,
            unsupported1: {
              properties: {
                binary_field: {
                  type: 'binary',
                },
              },
            },
            unsupported2: {
              properties: {
                binary_field: {
                  type: 'binary',
                },
              },
            },
          },
        } as const;

        expect(() =>
          getSortingParams(
            MAPPINGS_WITH_UNSUPPORTED,
            ['unsupported1', 'unsupported2'],
            'binary_field'
          )
        ).toThrow(
          'Sort field "unsupported1.binary_field" is of type "binary" which is not sortable.'
        );
      });
    });
  });
});
