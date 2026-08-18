/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';

import type { FormBasedPersistedState, TextBasedPersistedState } from '../datasources/types';

/**
 * Minimal structural shape shared by `LensDocument`, the persisted attributes
 * and other hand-built attribute objects. Only the parts these helpers need.
 *
 * Why not reuse `LensDocument` / `TypedLensSerializedState['attributes']`
 * wholesale?
 * - Callers pass heterogeneous shapes: `LensDocument`, saved-object
 *   attributes, embeddable runtime attributes, and hand-built attribute
 *   objects (e.g. in `kbn-unified-histogram`). No single existing document
 *   type covers all of them without casts:
 *   `LensDocument.state.datasourceStates` is `Record<string, unknown>` (no
 *   layer information), while `TypedLensSerializedState['attributes']`
 *   rejects `LensDocument` and lacks the legacy aggregate `state.query`
 *   slot value `getDocQuery` must read. A thin duck-typed wrapper with an
 *   optional `state` and a widened `query` union accepts all of them.
 * - The layer shapes themselves are reused (type-only imports, cycle-free):
 *   `DocLikeLayers` derives loosened views of `FormBasedPersistedState` /
 *   `TextBasedPersistedState` (as in `StructuredDatasourceStates`). The
 *   loosening (`layers` optional, layer entries `Partial`) reflects that
 *   persisted documents may predate the strict types (e.g. legacy form-based
 *   docs with an empty `textBased: {}` stub), which the helpers guard
 *   against at runtime. The `Record<string, unknown>` intersection keeps
 *   `LensDocument`'s untyped `datasourceStates` assignable.
 *
 * Assignability of the real types to this shape is enforced implicitly by
 * the call sites (e.g. Lens plugin, `kbn-unified-histogram`), which pass
 * those types to these helpers without casts.
 */
interface DocLikeLayers<T extends { layers: Record<string, unknown> }> {
  layers?: Record<string, Partial<T['layers'][string]> | undefined>;
}

export interface LensDocLikeState {
  query?: Query | AggregateQuery;
  datasourceStates?: {
    formBased?: DocLikeLayers<FormBasedPersistedState>;
    textBased?: DocLikeLayers<TextBasedPersistedState>;
  } & Record<string, unknown>;
}

export interface LensDocLike {
  state?: LensDocLikeState;
}

/**
 * Structural check for text-based (ES|QL) documents: based on the `textBased`
 * datasource state, not the (legacy, deprecated) aggregate value in
 * `state.query`. Some legacy form-based documents carry an empty `textBased`
 * stub next to their `formBased` state, so a document only counts as
 * text-based when it has text-based layers, or a `textBased` state without
 * any form-based layers (e.g. a freshly created ES|QL document).
 */
export const isTextBasedDoc = (doc: LensDocLike | undefined): boolean => {
  const datasourceStates = doc?.state?.datasourceStates;
  if (!datasourceStates || !('textBased' in datasourceStates)) {
    return false;
  }
  const hasTextBasedLayers = Object.keys(datasourceStates.textBased?.layers ?? {}).length > 0;
  const hasFormBasedLayers = Object.keys(datasourceStates.formBased?.layers ?? {}).length > 0;
  return hasTextBasedLayers || !hasFormBasedLayers;
};

/**
 * Returns the authoritative per-layer ES|QL queries of a text-based document
 * (`state.datasourceStates.textBased.layers[id].query`), in layer order.
 */
export const getTextBasedLayerQueries = (doc: LensDocLike | undefined): AggregateQuery[] => {
  const layers = doc?.state?.datasourceStates?.textBased?.layers;
  if (!layers) {
    return [];
  }
  return Object.values(layers).flatMap((layer) =>
    layer?.query && isOfAggregateQueryType(layer.query) ? [layer.query] : []
  );
};

/**
 * Returns a representative single query for the document:
 * - text-based documents: the first layer query, falling back to a legacy
 *   aggregate value still present in `state.query` (dual-written docs)
 * - form-based documents: the chart-scoped KQL/Lucene filter in `state.query`
 */
export const getDocQuery = (doc: LensDocLike | undefined): Query | AggregateQuery | undefined => {
  const [firstLayerQuery] = getTextBasedLayerQueries(doc);
  // the slot fallback covers form-based documents (chart-scoped filter) and
  // legacy text-based documents that only carry the aggregate slot copy
  return firstLayerQuery ?? doc?.state?.query;
};

/**
 * Read guard for the persisted `state.query` slot: any aggregate (ES|QL)
 * value is a legacy dual-written copy and is ignored — the layer queries are
 * authoritative. Returns the chart-scoped KQL/Lucene filter, or undefined.
 */
export const getChartScopedFilterQuery = (
  query: Query | AggregateQuery | undefined
): Query | undefined => (query && !isOfAggregateQueryType(query) ? query : undefined);
