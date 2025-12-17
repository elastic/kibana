/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isValidFieldName,
  fieldNameSchema,
  buildRuntimeMappings,
  buildSort,
  buildSearchQuery,
} from './query_builder';

describe('query_builder', () => {
  describe('isValidFieldName', () => {
    it('should return true for valid field names starting with a letter', () => {
      expect(isValidFieldName('title')).toBe(true);
      expect(isValidFieldName('myField')).toBe(true);
      expect(isValidFieldName('field123')).toBe(true);
      expect(isValidFieldName('my_field')).toBe(true);
      expect(isValidFieldName('MyField_123')).toBe(true);
    });

    it('should return false for field names starting with a number', () => {
      expect(isValidFieldName('123field')).toBe(false);
      expect(isValidFieldName('1title')).toBe(false);
    });

    it('should return false for field names starting with an underscore', () => {
      expect(isValidFieldName('_field')).toBe(false);
      expect(isValidFieldName('_title')).toBe(false);
    });

    it('should return false for field names with special characters', () => {
      expect(isValidFieldName('field-name')).toBe(false);
      expect(isValidFieldName('field.name')).toBe(false);
      expect(isValidFieldName('field name')).toBe(false);
      expect(isValidFieldName('field@name')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isValidFieldName('')).toBe(false);
    });
  });

  describe('fieldNameSchema', () => {
    it('should validate valid field names', () => {
      expect(() => fieldNameSchema.validate('title')).not.toThrow();
      expect(() => fieldNameSchema.validate('myField')).not.toThrow();
      expect(() => fieldNameSchema.validate('field_123')).not.toThrow();
    });

    it('should throw for invalid field names', () => {
      expect(() => fieldNameSchema.validate('_field')).toThrow();
      expect(() => fieldNameSchema.validate('123field')).toThrow();
      expect(() => fieldNameSchema.validate('field-name')).toThrow();
    });

    it('should throw for empty strings', () => {
      expect(() => fieldNameSchema.validate('')).toThrow();
    });
  });

  describe('buildRuntimeMappings', () => {
    it('should always include sortable_title mapping', () => {
      const mappings = buildRuntimeMappings();

      expect(mappings.sortable_title).toBeDefined();
      expect(mappings.sortable_title.type).toBe('keyword');
      expect(mappings.sortable_title.script).toBeDefined();
    });

    it('should not add custom mapping for root fields', () => {
      const rootFields = ['updatedAt', 'createdAt', 'updatedBy', 'createdBy', 'managed'];

      for (const field of rootFields) {
        const mappings = buildRuntimeMappings(field);
        expect(mappings[`sortable_${field}`]).toBeUndefined();
      }
    });

    it('should not add custom mapping for title field', () => {
      const mappings = buildRuntimeMappings('title');
      expect(mappings.sortable_title).toBeDefined();
      expect(Object.keys(mappings)).toHaveLength(1);
    });

    it('should add custom runtime mapping for custom attribute fields', () => {
      const mappings = buildRuntimeMappings('customField');

      expect(mappings.sortable_customField).toBeDefined();
      expect(mappings.sortable_customField.type).toBe('keyword');
      expect(mappings.sortable_customField.script).toBeDefined();
      expect(
        (mappings.sortable_customField.script as { params: { fieldName: string } }).params
      ).toEqual({ fieldName: 'customField' });
    });
  });

  describe('buildSort', () => {
    it('should map title to sortable_title', () => {
      const sort = buildSort('title', 'asc');

      expect(sort).toEqual([{ sortable_title: { order: 'asc', unmapped_type: 'keyword' } }]);
    });

    it('should map root fields to snake_case', () => {
      expect(buildSort('updatedAt', 'desc')).toEqual([
        { updated_at: { order: 'desc', unmapped_type: 'keyword' } },
      ]);

      expect(buildSort('createdAt', 'asc')).toEqual([
        { created_at: { order: 'asc', unmapped_type: 'keyword' } },
      ]);

      expect(buildSort('updatedBy', 'desc')).toEqual([
        { updated_by: { order: 'desc', unmapped_type: 'keyword' } },
      ]);

      expect(buildSort('createdBy', 'asc')).toEqual([
        { created_by: { order: 'asc', unmapped_type: 'keyword' } },
      ]);

      expect(buildSort('managed', 'desc')).toEqual([
        { managed: { order: 'desc', unmapped_type: 'keyword' } },
      ]);
    });

    it('should map custom attribute fields to sortable_* runtime fields', () => {
      expect(buildSort('customField', 'asc')).toEqual([
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { sortable_customField: { order: 'asc', unmapped_type: 'keyword' } },
      ]);
    });
  });

  describe('buildSearchQuery', () => {
    it('should build a match_all query when no filters are provided', () => {
      const query = buildSearchQuery({ type: 'dashboard' });

      expect(query).toEqual({
        bool: {
          must: [{ match_all: {} }],
          filter: [],
        },
      });
    });

    it('should add simple_query_string for text search', () => {
      const query = buildSearchQuery({
        type: 'dashboard',
        searchQuery: 'test query',
      });

      expect(query.bool?.must).toContainEqual({
        simple_query_string: {
          query: 'test query*',
          fields: ['dashboard.title^3', 'dashboard.description'],
          default_operator: 'and',
        },
      });
    });

    it('should build search fields for multiple types', () => {
      const query = buildSearchQuery({
        type: ['dashboard', 'visualization'],
        searchQuery: 'test',
      });

      expect(query.bool?.must).toContainEqual({
        simple_query_string: {
          query: 'test*',
          fields: [
            'dashboard.title^3',
            'dashboard.description',
            'visualization.title^3',
            'visualization.description',
          ],
          default_operator: 'and',
        },
      });
    });

    it('should add nested query for tag includes', () => {
      const query = buildSearchQuery({
        type: 'dashboard',
        tags: { include: ['tag1', 'tag2'] },
      });

      // Uses OR logic (should + minimum_should_match) to match documents with ANY of the specified tags.
      expect(query.bool?.filter).toContainEqual({
        bool: {
          should: [
            {
              nested: {
                path: 'references',
                query: {
                  bool: {
                    must: [
                      { term: { 'references.type': 'tag' } },
                      { term: { 'references.id': 'tag1' } },
                    ],
                  },
                },
              },
            },
            {
              nested: {
                path: 'references',
                query: {
                  bool: {
                    must: [
                      { term: { 'references.type': 'tag' } },
                      { term: { 'references.id': 'tag2' } },
                    ],
                  },
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    });

    it('should add nested query for tag excludes', () => {
      const query = buildSearchQuery({
        type: 'dashboard',
        tags: { exclude: ['tag1'] },
      });

      expect(query.bool?.filter).toContainEqual({
        bool: {
          must_not: [
            {
              nested: {
                path: 'references',
                query: {
                  bool: {
                    must: [
                      { term: { 'references.type': 'tag' } },
                      { term: { 'references.id': 'tag1' } },
                    ],
                  },
                },
              },
            },
          ],
        },
      });
    });

    it('should add ids query for favorites filter', () => {
      const query = buildSearchQuery({
        type: 'dashboard',
        favoritesOnly: true,
        favoriteRawIds: ['dashboard:123', 'dashboard:456'],
      });

      expect(query.bool?.filter).toContainEqual({
        ids: { values: ['dashboard:123', 'dashboard:456'] },
      });
    });

    it('should not add favorites filter when favoritesOnly is false', () => {
      const query = buildSearchQuery({
        type: 'dashboard',
        favoritesOnly: false,
        favoriteRawIds: ['dashboard:123'],
      });

      expect(query.bool?.filter).not.toContainEqual(
        expect.objectContaining({ ids: expect.anything() })
      );
    });

    it('should add terms filter for createdBy', () => {
      const query = buildSearchQuery({
        type: 'dashboard',
        createdBy: ['u_user1', 'u_user2'],
      });

      expect(query.bool?.filter).toContainEqual({
        terms: { created_by: ['u_user1', 'u_user2'] },
      });
    });

    it('should filter for items without creator when "no-user" is in createdBy', () => {
      const query = buildSearchQuery({
        type: 'dashboard',
        createdBy: ['no-user'],
      });

      // Should filter for documents without created_by field.
      expect(query.bool?.filter).toContainEqual({
        bool: {
          must_not: [{ exists: { field: 'created_by' } }],
        },
      });
      // Should exclude managed items.
      expect(query.bool?.filter).toContainEqual({
        term: { managed: false },
      });
    });

    it('should combine "no-user" with regular user UIDs', () => {
      const query = buildSearchQuery({
        type: 'dashboard',
        createdBy: ['u_user1', 'no-user'],
      });

      // Should use a bool query with should clauses for OR logic.
      expect(query.bool?.filter).toContainEqual({
        bool: {
          should: [
            { terms: { created_by: ['u_user1'] } },
            {
              bool: {
                must_not: [{ exists: { field: 'created_by' } }],
                filter: [{ term: { managed: false } }],
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    });

    it('should combine multiple filters', () => {
      const query = buildSearchQuery({
        type: 'dashboard',
        searchQuery: 'test',
        tags: { include: ['tag1'], exclude: ['tag2'] },
        createdBy: ['u_user1'],
      });

      expect(query.bool?.must).toHaveLength(1);
      expect(query.bool?.filter).toHaveLength(3); // include, exclude, createdBy
    });
  });
});
