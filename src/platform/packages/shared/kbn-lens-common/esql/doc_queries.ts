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

/**
 * Minimal structural shape shared by `LensDocument`, the persisted attributes
 * and other hand-built attribute objects. Only the parts these helpers need.
 */
export interface LensDocLikeState {
  query?: Query | AggregateQuery;
  datasourceStates?: {
    formBased?: {
      layers?: Record<string, unknown>;
    };
    textBased?: {
      layers?: Record<string, { query?: AggregateQuery | null } | undefined>;
    };
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
