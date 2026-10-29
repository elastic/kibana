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
 *   slot value `getRepresentativeQuery` must read. A thin duck-typed wrapper with an
 *   optional `state` and a widened `query` union accepts all of them.
 * - The layer shapes themselves are reused (type-only imports, cycle-free):
 *   `LooseLayers` derives loosened views of `FormBasedPersistedState` /
 *   `TextBasedPersistedState` (as in `StructuredDatasourceStates`). The
 *   loosening (`layers` optional, layer entries `Partial`) reflects that
 *   persisted documents may predate the strict types (e.g. legacy form-based
 *   docs with an empty `textBased: {}` stub), which the helpers guard
 *   against at runtime. `datasourceStates` itself stays `Record<string,
 *   unknown>` so both `LensDocument`'s untyped shape and the strict
 *   persisted shapes are assignable; the helpers narrow to `LooseLayers`
 *   views internally (single, documented cast).
 *
 * Assignability of the real types to this shape is enforced implicitly by
 * the call sites (e.g. Lens plugin, `kbn-unified-histogram`), which pass
 * those types to these helpers without casts.
 */
interface LooseLayers<T extends { layers: Record<string, unknown> }> {
  layers?: Record<string, Partial<T['layers'][string]> | undefined>;
}

export interface MinimalLensState {
  query?: Query | AggregateQuery;
  datasourceStates?: Record<string, unknown>;
}

export interface MinimalLensAttributes {
  state?: MinimalLensState;
}

interface LooseDatasourceStates {
  formBased?: LooseLayers<FormBasedPersistedState>;
  textBased?: LooseLayers<TextBasedPersistedState>;
}

// single narrowing point from the duck-typed `Record<string, unknown>` to the
// loosened persisted layer shapes; every access below runtime-guards anyway
const viewDatasourceStates = (
  attributes: MinimalLensAttributes | undefined
): LooseDatasourceStates | undefined =>
  attributes?.state?.datasourceStates as LooseDatasourceStates | undefined;

/**
 * True when the document has at least one text-based (ES|QL) layer.
 */
export const hasTextBasedLayers = (attributes: MinimalLensAttributes | undefined): boolean =>
  Object.keys(viewDatasourceStates(attributes)?.textBased?.layers ?? {}).length > 0;

/**
 * Structural check for text-based (ES|QL) documents: based on the `textBased`
 * datasource state, not the (legacy, deprecated) aggregate value in
 * `state.query`. Some legacy form-based documents carry an empty `textBased`
 * stub next to their `formBased` state, so a document only counts as
 * text-based when it has text-based layers, or a `textBased` state without
 * any form-based layers (e.g. a freshly created ES|QL document).
 *
 * Legacy `indexpattern`-era (≤8.5) documents predate the `textBased` key
 * (introduced in 8.6, alongside the `indexpattern` → `formBased` rename) and
 * therefore never reach the no-form-based-layers fallback — the `'textBased'
 * in` gate classifies them as form-based.
 */
export const isTextBasedAttributes = (attributes: MinimalLensAttributes | undefined): boolean => {
  const datasourceStates = viewDatasourceStates(attributes);
  if (!datasourceStates || !('textBased' in datasourceStates)) {
    return false;
  }
  const hasFormBasedLayers = Object.keys(datasourceStates.formBased?.layers ?? {}).length > 0;
  return hasTextBasedLayers(attributes) || !hasFormBasedLayers;
};

/**
 * Returns the authoritative per-layer ES|QL queries of a text-based document
 * (`state.datasourceStates.textBased.layers[id].query`), in layer order.
 */
export const getTextBasedLayerQueries = (
  attributes: MinimalLensAttributes | undefined
): AggregateQuery[] => {
  const layers = viewDatasourceStates(attributes)?.textBased?.layers;
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
export const getRepresentativeQuery = (
  attributes: MinimalLensAttributes | undefined
): Query | AggregateQuery | undefined => {
  const [firstLayerQuery] = getTextBasedLayerQueries(attributes);
  // the slot fallback covers form-based documents (chart-scoped filter) and
  // legacy text-based documents that only carry the aggregate slot copy
  return firstLayerQuery ?? attributes?.state?.query;
};

/**
 * Canonical "no chart filter" value for the `state.query` slot and the
 * editor query seed. Treat as immutable.
 */
export const EMPTY_KQL_QUERY: Readonly<Query> = { query: '', language: 'kuery' };

/**
 * Read guard for legacy dual-written documents: any aggregate (ES|QL) value
 * in the persisted `state.query` slot is dead data — the layer queries are
 * authoritative — and is dropped. Documents self-clean on next save.
 */
export const dropLegacyAggregateQuerySlot = <
  T extends { state?: { query?: Query | AggregateQuery } }
>(
  attributes: T
): T => {
  const guarded = getChartScopedFilterQuery(attributes.state?.query);
  if (guarded === attributes.state?.query) {
    return attributes;
  }
  return { ...attributes, state: { ...attributes.state, query: guarded } };
};

/**
 * Compatibility write for mixed-version windows (serverless rollback,
 * rolling Cloud upgrades): older Kibana versions detect ES|QL mode via the
 * aggregate value in `state.query`, so saves mirror the first authoritative
 * layer query back into the slot. Newer readers ignore the mirror (see
 * `getChartScopedFilterQuery`).
 *
 * The mirror is only written when the slot is empty (undefined, an empty
 * KQL/Lucene default, or an existing aggregate copy): a non-empty
 * KQL/Lucene value is a chart-scoped filter of a mixed form+text document
 * and must never be overwritten.
 *
 * @deprecated remove (along with its call sites) once the minimum
 * version compatible with this deployment ships structural readers — i.e.
 * one release after the slot removal lands.
 */
export const withLegacyAggregateQuerySlot = <T extends MinimalLensAttributes>(attributes: T): T => {
  const [firstLayerQuery] = getTextBasedLayerQueries(attributes);
  if (!firstLayerQuery || !attributes.state) {
    return attributes;
  }
  const slot = attributes.state.query;
  const isSlotEmpty =
    !slot || isOfAggregateQueryType(slot) || ('query' in slot && slot.query === '');
  if (!isSlotEmpty || slot === firstLayerQuery) {
    return attributes;
  }
  return { ...attributes, state: { ...attributes.state, query: firstLayerQuery } };
};

/**
 * Read guard for the persisted `state.query` slot: any aggregate (ES|QL)
 * value is a legacy dual-written copy and is ignored — the layer queries are
 * authoritative. Returns the chart-scoped KQL/Lucene filter, or undefined.
 */
export const getChartScopedFilterQuery = (
  query: Query | AggregateQuery | undefined
): Query | undefined => (query && !isOfAggregateQueryType(query) ? query : undefined);
