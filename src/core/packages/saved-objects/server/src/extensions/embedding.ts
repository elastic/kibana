/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Reserved extension point for the `dense_vector` / pre-computed-embeddings path (ADR-2).
 *
 * This interface is defined now so that the slot in `create`/`bulk_create`/`update`/`bulk_update`
 * next to `optionallyEncryptAttributes` is committed from day one, but it is **not yet invoked by
 * the repository**. The synchronous `semantic_text` + writer-controlled shadow-field strategy
 * (Mechanism B) does not require a Kibana-side interception point. This extension becomes
 * load-bearing only if S4 findings show that pre-computed embeddings must bypass ES inference, or
 * if a `dense_vector` path is promoted for bulk-heavy types. Do not implement or call this
 * extension without a deliberate ADR-2 reversal.
 */
export interface ISavedObjectsEmbeddingExtension {
  /**
   * Returns true if a type has been registered as embeddable (i.e. declares
   * {@link SavedObjectsType.semanticSearch | semanticSearch}).
   * @param type - the string name of the object type
   * @returns boolean, true if the type is embeddable
   */
  isEmbeddableType: (type: string) => boolean;

  /**
   * Given a saved object descriptor and its current attributes, returns attributes augmented with
   * pre-computed embedding values in the shadow-field convention (`{field}_semantic`).
   * @param descriptor - an object containing a saved object id and type
   * @param attributes - T, the current attributes of the saved object
   * @returns T, attributes with shadow embedding fields populated
   */
  embedAttributes: <T>(descriptor: { type: string; id: string }, attributes: T) => Promise<T>;

  /**
   * Returns true if the type accepts pre-computed embeddings supplied by the caller (e.g. from a
   * package build pipeline), bypassing ES inference on write.
   * @param type - the string name of the object type
   * @returns boolean, true if caller-supplied embeddings are accepted for this type
   */
  acceptsPrecomputedEmbeddings: (type: string) => boolean;
}
