/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID } from '@kbn/core-saved-objects-base-server-internal';
import { buildTypesMappings } from './build_types_mappings';

const createType = (overrides: Partial<SavedObjectsType> = {}): SavedObjectsType => ({
  name: 'test',
  hidden: false,
  namespaceType: 'single',
  mappings: { properties: {} },
  ...overrides,
});

describe('buildTypesMappings', () => {
  describe('types without semanticSearch', () => {
    it('emits mappings unchanged for a plain type', () => {
      const type = createType({
        name: 'plain',
        mappings: { properties: { title: { type: 'text' }, count: { type: 'long' } } },
      });
      const result = buildTypesMappings([type]);
      expect(result).toEqual({ plain: type.mappings });
    });

    it('emits the same mapping object reference when no semanticSearch is declared', () => {
      const type = createType({ name: 'plain' });
      const result = buildTypesMappings([type]);
      expect(result.plain).toBe(type.mappings);
    });
  });

  describe('shadow field emission', () => {
    it('emits a shadow semantic_text field with the platform default inference id', () => {
      const type = createType({
        name: 'dashboard',
        mappings: { properties: { title: { type: 'text' } } },
        semanticSearch: { fields: ['title'] },
      });
      const result = buildTypesMappings([type]);
      expect(result.dashboard.properties.title_semantic).toEqual({
        type: 'semantic_text',
        inference_id: DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID,
      });
    });

    it('uses the declared inferenceId override instead of the default', () => {
      const customId = '.my-custom-endpoint';
      const type = createType({
        name: 'rule',
        mappings: { properties: { name: { type: 'text' } } },
        semanticSearch: { fields: ['name'], inferenceId: customId },
      });
      const result = buildTypesMappings([type]);
      expect(result.rule.properties.name_semantic).toEqual({
        type: 'semantic_text',
        inference_id: customId,
      });
    });

    it('emits a shadow field for each declared field when multiple fields are listed', () => {
      const type = createType({
        name: 'dashboard',
        mappings: {
          properties: {
            title: { type: 'text' },
            description: { type: 'text' },
            notes: { type: 'text' },
          },
        },
        semanticSearch: { fields: ['title', 'description', 'notes'] },
      });
      const result = buildTypesMappings([type]);
      const props = result.dashboard.properties;
      expect(props.title_semantic).toEqual({
        type: 'semantic_text',
        inference_id: DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID,
      });
      expect(props.description_semantic).toEqual({
        type: 'semantic_text',
        inference_id: DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID,
      });
      expect(props.notes_semantic).toEqual({
        type: 'semantic_text',
        inference_id: DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID,
      });
    });
  });

  describe('Mechanism B invariant: source field mapping untouched', () => {
    it('preserves the source field mapping byte-for-byte — no copy_to added', () => {
      const sourceFieldMapping = { type: 'text' as const };
      const type = createType({
        name: 'dashboard',
        mappings: { properties: { title: sourceFieldMapping } },
        semanticSearch: { fields: ['title'] },
      });
      const result = buildTypesMappings([type]);
      // The source field must be deep-equal to the original — no modification whatsoever.
      expect(result.dashboard.properties.title).toEqual(sourceFieldMapping);
      // Specifically, no copy_to must have been injected.
      expect(
        (result.dashboard.properties.title as Record<string, unknown>).copy_to
      ).toBeUndefined();
    });

    it('preserves all source field properties including extra fields', () => {
      const type = createType({
        name: 'search',
        mappings: {
          properties: {
            body: {
              type: 'text',
              analyzer: 'english',
              index_options: 'offsets',
            },
          },
        },
        semanticSearch: { fields: ['body'] },
      });
      const result = buildTypesMappings([type]);
      expect(result.search.properties.body).toEqual({
        type: 'text',
        analyzer: 'english',
        index_options: 'offsets',
      });
    });
  });

  describe('frozen input safety', () => {
    it('does not throw when the type object is frozen', () => {
      const type = Object.freeze(
        createType({
          name: 'frozen',
          mappings: Object.freeze({
            properties: Object.freeze({
              title: Object.freeze({ type: 'text' as const }),
            }),
          }) as SavedObjectsType['mappings'],
          semanticSearch: Object.freeze({ fields: Object.freeze(['title']) as string[] }),
        })
      ) as SavedObjectsType;

      expect(() => buildTypesMappings([type])).not.toThrow();
      const result = buildTypesMappings([type]);
      expect(result.frozen.properties.title_semantic).toEqual({
        type: 'semantic_text',
        inference_id: DEFAULT_SEMANTIC_SEARCH_INFERENCE_ID,
      });
    });
  });

  describe('types without semanticSearch are unaffected by semantic types in the same call', () => {
    it('emits a clean mapping for a plain type when a semantic type is also registered', () => {
      const plainType = createType({
        name: 'plain',
        mappings: { properties: { title: { type: 'keyword' } } },
      });
      const semanticType = createType({
        name: 'semantic',
        mappings: { properties: { body: { type: 'text' } } },
        semanticSearch: { fields: ['body'] },
      });
      const result = buildTypesMappings([plainType, semanticType]);
      // plain type: exact same mapping, no shadow fields
      expect(result.plain).toEqual(plainType.mappings);
      expect(Object.keys(result.plain.properties)).toEqual(['title']);
      // semantic type: shadow field added, source field unchanged
      expect(Object.keys(result.semantic.properties).sort()).toEqual(['body', 'body_semantic']);
    });
  });

  describe('duplicate type names', () => {
    it('throws when two types share the same name', () => {
      const type1 = createType({ name: 'dup' });
      const type2 = createType({ name: 'dup' });
      expect(() => buildTypesMappings([type1, type2])).toThrow('Type dup is already defined.');
    });
  });
});
