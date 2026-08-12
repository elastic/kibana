/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { EmbeddingHelper } from './embedding';

/** Minimal registry mock for embedding helper tests. */
const createRegistryMock = (
  definitions: Record<
    string,
    { fields: readonly string[]; inferenceId: string; embedding: 'sync' | 'deferred' } | undefined
  > = {}
): jest.Mocked<ISavedObjectTypeRegistry> => {
  return {
    getSemanticSearchDefinition: jest.fn((typeName: string) => definitions[typeName] ?? undefined),
  } as unknown as jest.Mocked<ISavedObjectTypeRegistry>;
};

describe('EmbeddingHelper.populateSemanticFields', () => {
  let helper: EmbeddingHelper;

  // ── Not opted-in types ──────────────────────────────────────────────────────

  describe('when the type does not declare semanticSearch', () => {
    beforeEach(() => {
      helper = new EmbeddingHelper({ registry: createRegistryMock() });
    });

    it('returns the exact same attributes reference (hot path, zero allocation)', () => {
      const attrs = { title: 'Hello' };
      expect(helper.populateSemanticFields('no-search-type', attrs)).toBe(attrs);
    });

    it('does not alter any attribute values', () => {
      const attrs = { a: 1, b: 'text' };
      expect(helper.populateSemanticFields('no-search-type', attrs)).toEqual({ a: 1, b: 'text' });
    });
  });

  // ── Sync mode (default) ─────────────────────────────────────────────────────

  describe('when the type declares semanticSearch with embedding: "sync" (default)', () => {
    const syncDef = {
      fields: ['title', 'description'] as readonly string[],
      inferenceId: '.elser-2-elasticsearch',
      embedding: 'sync' as const,
    };

    beforeEach(() => {
      helper = new EmbeddingHelper({
        registry: createRegistryMock({ 'my-type': syncDef }),
      });
    });

    it('returns a NEW object (not the same reference)', () => {
      const attrs = { title: 'Hello', description: 'World' };
      const result = helper.populateSemanticFields('my-type', attrs);
      expect(result).not.toBe(attrs);
    });

    it('copies source field text into shadow keys for non-empty string values', () => {
      const attrs = { title: 'Dashboard A', description: 'Shows metrics' };
      const result = helper.populateSemanticFields('my-type', attrs) as Record<string, unknown>;
      expect(result.title_semantic).toBe('Dashboard A');
      expect(result.description_semantic).toBe('Shows metrics');
    });

    it('preserves non-declared attributes unchanged', () => {
      const attrs = { title: 'Hello', otherField: 'value', nested: { x: 1 } };
      const result = helper.populateSemanticFields('my-type', attrs) as Record<string, unknown>;
      expect(result.otherField).toBe('value');
      expect(result.nested).toEqual({ x: 1 });
    });

    it('does NOT mutate the input attributes object', () => {
      const attrs = { title: 'Hello', description: 'World' };
      const original = { ...attrs };
      helper.populateSemanticFields('my-type', attrs);
      expect(attrs).toEqual(original);
    });

    describe('present-but-cleared field values emit null (Finding #3)', () => {
      // When a declared field KEY is present in the input but its value is not a non-empty
      // string, we emit `null` for the shadow key.  This ensures that on the update path,
      // mergeForUpdate overwrites any stale stored shadow with null (ES then skips inference).
      // On the create path, emitting null is harmless (there is no stored shadow to clear).

      it('emits null shadow key for a null value', () => {
        const attrs = { title: null as unknown as string, description: 'World' };
        const result = helper.populateSemanticFields('my-type', attrs) as Record<string, unknown>;
        expect(result.title_semantic).toBeNull();
        expect(result.description_semantic).toBe('World');
      });

      it('emits null shadow key for an undefined value (key present, value undefined)', () => {
        const attrs = { title: undefined as unknown as string, description: 'World' };
        const result = helper.populateSemanticFields('my-type', attrs) as Record<string, unknown>;
        expect(result.title_semantic).toBeNull();
      });

      it('emits null shadow key for an empty string value', () => {
        const attrs = { title: '', description: 'World' };
        const result = helper.populateSemanticFields('my-type', attrs) as Record<string, unknown>;
        expect(result.title_semantic).toBeNull();
      });

      it('emits null shadow key for a numeric value (type mismatch)', () => {
        const attrs = { title: 42 as unknown as string, description: 'World' };
        const result = helper.populateSemanticFields('my-type', attrs) as Record<string, unknown>;
        expect(result.title_semantic).toBeNull();
      });

      it('skips a declared field that is ABSENT from the attributes — no shadow key emitted', () => {
        // Only `title` present; `description` is not a key in the input at all.
        // This preserves the stored shadow via mergeForUpdate (staleness rule).
        const attrs = { title: 'Hello' };
        const result = helper.populateSemanticFields('my-type', attrs) as Record<string, unknown>;
        expect(result.title_semantic).toBe('Hello');
        expect(result).not.toHaveProperty('description_semantic');
      });
    });

    describe('stripping caller-supplied shadow keys', () => {
      it('strips keys ending with _semantic from the input', () => {
        const attrs = { title: 'Hello', title_semantic: 'stale value', description: 'World' };
        const result = helper.populateSemanticFields('my-type', attrs) as Record<string, unknown>;
        // The helper re-derives title_semantic from the source; the stale value is gone.
        expect(result.title_semantic).toBe('Hello');
        expect(result.description_semantic).toBe('World');
      });

      it('strips shadow keys for non-declared fields too (defense-in-depth)', () => {
        const attrs = { title: 'Hello', some_other_field_semantic: 'caller-injected' };
        const result = helper.populateSemanticFields('my-type', attrs) as Record<string, unknown>;
        expect(result).not.toHaveProperty('some_other_field_semantic');
      });
    });
  });

  // ── Deferred mode via per-type default ──────────────────────────────────────

  describe('when the type declares semanticSearch with embedding: "deferred"', () => {
    const deferredDef = {
      fields: ['title'] as readonly string[],
      inferenceId: '.elser-2-elasticsearch',
      embedding: 'deferred' as const,
    };

    beforeEach(() => {
      helper = new EmbeddingHelper({
        registry: createRegistryMock({ 'deferred-type': deferredDef }),
      });
    });

    it('returns a new object with no shadow keys added', () => {
      const attrs = { title: 'Hello', extra: 'value' };
      const result = helper.populateSemanticFields('deferred-type', attrs) as Record<
        string,
        unknown
      >;
      expect(result).not.toHaveProperty('title_semantic');
    });

    it('strips caller-supplied shadow keys even in deferred mode', () => {
      const attrs = { title: 'Hello', title_semantic: 'stale caller value' };
      const result = helper.populateSemanticFields('deferred-type', attrs) as Record<
        string,
        unknown
      >;
      expect(result).not.toHaveProperty('title_semantic');
      // Source field is untouched
      expect(result.title).toBe('Hello');
    });

    it('preserves non-shadow attributes', () => {
      const attrs = { title: 'Hello', other: 42 };
      const result = helper.populateSemanticFields('deferred-type', attrs) as Record<
        string,
        unknown
      >;
      expect(result.title).toBe('Hello');
      expect(result.other).toBe(42);
    });
  });

  // ── Per-request override: deferEmbeddings flag ──────────────────────────────

  describe('per-request deferEmbeddings override', () => {
    const syncDef = {
      fields: ['title'] as readonly string[],
      inferenceId: '.elser-2-elasticsearch',
      embedding: 'sync' as const,
    };
    const deferredDef = {
      fields: ['title'] as readonly string[],
      inferenceId: '.elser-2-elasticsearch',
      embedding: 'deferred' as const,
    };

    it('deferEmbeddings=true overrides a sync-default type (no shadow keys emitted)', () => {
      helper = new EmbeddingHelper({
        registry: createRegistryMock({ 'sync-type': syncDef }),
      });
      const attrs = { title: 'Hello' };
      const result = helper.populateSemanticFields('sync-type', attrs, true) as Record<
        string,
        unknown
      >;
      expect(result).not.toHaveProperty('title_semantic');
    });

    it('deferEmbeddings=false overrides a deferred-default type (shadow keys emitted)', () => {
      helper = new EmbeddingHelper({
        registry: createRegistryMock({ 'deferred-type': deferredDef }),
      });
      const attrs = { title: 'Hello' };
      const result = helper.populateSemanticFields('deferred-type', attrs, false) as Record<
        string,
        unknown
      >;
      expect(result.title_semantic).toBe('Hello');
    });

    it('deferEmbeddings=undefined falls back to per-type default (sync emits, deferred does not)', () => {
      helper = new EmbeddingHelper({
        registry: createRegistryMock({ 'sync-type': syncDef, 'deferred-type': deferredDef }),
      });
      const attrs = { title: 'Hello' };

      const syncResult = helper.populateSemanticFields('sync-type', attrs, undefined) as Record<
        string,
        unknown
      >;
      expect(syncResult.title_semantic).toBe('Hello');

      const deferredResult = helper.populateSemanticFields(
        'deferred-type',
        attrs,
        undefined
      ) as Record<string, unknown>;
      expect(deferredResult).not.toHaveProperty('title_semantic');
    });
  });

  // ── Update staleness rule ────────────────────────────────────────────────────

  describe('partial-update semantics (update staleness rule)', () => {
    const syncDef = {
      fields: ['title', 'description'] as readonly string[],
      inferenceId: '.elser-2-elasticsearch',
      embedding: 'sync' as const,
    };

    beforeEach(() => {
      helper = new EmbeddingHelper({
        registry: createRegistryMock({ 'my-type': syncDef }),
      });
    });

    it('only emits a shadow key for declared fields that are present in the partial attributes', () => {
      // Partial update: only `title` is being updated.
      const partialAttrs = { title: 'Updated Title' };
      const result = helper.populateSemanticFields('my-type', partialAttrs) as Record<
        string,
        unknown
      >;
      expect(result.title_semantic).toBe('Updated Title');
      // `description` is absent from the partial update, so its shadow key is not emitted.
      // The stored doc's existing `description_semantic` is preserved by mergeForUpdate.
      expect(result).not.toHaveProperty('description_semantic');
    });
  });
});
