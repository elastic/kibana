/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import {
  SEMANTIC_FIELD_SUFFIX,
  getSemanticFieldName,
} from '@kbn/core-saved-objects-base-server-internal';

export type IEmbeddingHelper = PublicMethodsOf<EmbeddingHelper>;

/**
 * Populates or suppresses shadow semantic fields on the write path (Mechanism B, ADR-6).
 *
 * Incompatibility note: a type must not declare both {@link SavedObjectsType.semanticSearch} and
 * use the ESO encryption extension (i.e. be registered as an encryptable type).  Shadow keys are
 * added after validation and migration but before `savedObjectToRaw`; if the ESO extension also
 * operates on the same attributes the AAD computed at write time will include shadow keys while
 * the read path strips them before decryption, producing AAD mismatches.  Nothing enforces this
 * at registration time because core cannot see ESO registrations — type authors are responsible
 * for not combining the two options.
 */
export class EmbeddingHelper {
  private readonly registry: ISavedObjectTypeRegistry;

  constructor({ registry }: { registry: ISavedObjectTypeRegistry }) {
    this.registry = registry;
  }

  /**
   * Returns attributes with shadow `{field}_semantic` keys populated for types that declare
   * {@link SavedObjectsType.semanticSearch | semanticSearch}, or the same reference when the type
   * is not opted in (hot path, zero allocation).
   *
   * Behavior:
   * - **Not opted in**: returns the original `attributes` reference unchanged.
   * - **Deferred mode** (`deferEmbeddings ?? definition.embedding === 'deferred'`): strips any
   *   caller-supplied `*_semantic` keys and returns a new object with no shadow fields.
   *   Elasticsearch performs no inference; the object is eventually embedded by the reconciler.
   * - **Sync mode**: strips caller-supplied `*_semantic` keys (callers must never write shadow
   *   fields directly), then for each declared field that is **present in the input**:
   *   - non-empty string → copies the value as `{field}_semantic` (ES embeds synchronously);
   *   - present but cleared (null, empty string, non-string) → emits `null` so ES skips
   *     inference (S7) and any stale stored shadow is overwritten.
   *   Fields **absent** from the input are skipped — for partial updates this preserves the
   *   stored shadow value via `mergeForUpdate`; for creates there is no stored shadow.
   *
   * This function is synchronous and performs no I/O; Elasticsearch runs inference at index time
   * when the shadow key is present in the raw document.
   */
  readonly populateSemanticFields = <T>(
    type: string,
    attributes: T,
    deferEmbeddings?: boolean
  ): T => {
    const definition = this.registry.getSemanticSearchDefinition(type);
    if (!definition) {
      // Hot path: type is not opted in — return the same reference, zero allocation.
      return attributes;
    }

    const isDeferred = deferEmbeddings ?? definition.embedding === 'deferred';

    // Build a new object: copy all non-shadow keys, then (sync mode only) append shadow copies
    // of declared source fields that carry a non-empty string value.
    // Stripping caller-supplied shadow keys is always done — even in deferred mode — because
    // callers must never write shadow fields directly; the helper is the sole writer.
    const raw = attributes as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(raw)) {
      if (!key.endsWith(SEMANTIC_FIELD_SUFFIX)) {
        result[key] = raw[key];
      }
    }

    if (!isDeferred) {
      for (const field of definition.fields) {
        if (!Object.hasOwn(raw, field)) {
          // Field absent from this input — skip entirely.
          // For partial updates the stored shadow survives mergeForUpdate unchanged.
          // For creates there is no stored shadow to preserve.
          continue;
        }
        const value = raw[field];
        if (typeof value === 'string' && value.length > 0) {
          result[getSemanticFieldName(field)] = value;
        } else {
          // Field is present but cleared (empty string, null, non-string).
          // Emit null: ES skips inference (S7 spike finding) and mergeForUpdate overwrites
          // any stale shadow from the stored document.
          result[getSemanticFieldName(field)] = null;
        }
      }
    }

    return result as T;
  };

  /**
   * Returns only the shadow field entries derived from a partial update's `attributes`, for
   * overlay onto the post-merge, post-migration document.  Only fields explicitly present in the
   * input produce an entry; absent fields are omitted so that the stored shadow value (preserved
   * by `mergeForUpdate`) is left intact.  Returns an empty record for non-opted-in types or when
   * the per-type default is `'deferred'` (the reconciler handles embedding in that case).
   *
   * Use this in the update write path AFTER `migrateInputDocument`, so that shadow keys never
   * pass through migration transforms that may rebuild attributes from scratch.
   */
  readonly shadowFieldsForUpdate = <T>(type: string, attributes: T): Record<string, unknown> => {
    const definition = this.registry.getSemanticSearchDefinition(type);
    if (!definition || definition.embedding === 'deferred') {
      return {};
    }
    const raw = attributes as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const field of definition.fields) {
      if (!Object.hasOwn(raw, field)) {
        continue; // Absent from partial — preserve the stored shadow via mergeForUpdate.
      }
      const value = raw[field];
      result[getSemanticFieldName(field)] =
        typeof value === 'string' && value.length > 0 ? value : null;
    }
    return result;
  };
}
