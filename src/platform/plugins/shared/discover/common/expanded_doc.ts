/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { type AggregateQuery, type Query, isOfAggregateQueryType } from '@kbn/es-query';
import { hasTransformationalCommand, retrieveMetadataColumns } from '@kbn/esql-utils';

/**
 * Identifies the document expanded in the doc viewer flyout, so it can be captured
 * in a shareable link and restored on load.
 *
 * `_id` and `_index` are kept separate rather than using the composed doc ID
 * (see `getDocId`) so the reference stays parseable when `_index` is a cross cluster
 * reference (e.g. `cluster:index`), and so it maps directly onto the
 * `METADATA _id, _index` columns if ES|QL support is added later.
 */
export interface ExpandedDocRef extends SerializableRecord {
  id: string;
  index: string;
}

/**
 * Builds the shareable reference for a record, or `undefined` when the record has no
 * stable identity. ES|QL rows only carry `_id` and `_index` when the query requests
 * `METADATA _id, _index`, so this doubles as the check for whether a record is linkable.
 */
export const getExpandedDocRef = (doc: DataTableRecord | undefined): ExpandedDocRef | undefined => {
  const { _id: id, _index: index } = doc?.raw ?? {};

  return id && index ? { id, index } : undefined;
};

/**
 * Matches a record against a reference. Compares the raw fields rather than the composed
 * doc ID so the result is unaffected by `_routing`, which the reference does not carry.
 */
export const matchesExpandedDocRef = (doc: DataTableRecord, ref: ExpandedDocRef) =>
  doc.raw._id === ref.id && doc.raw._index === ref.index;

/**
 * Whether documents returned by a query can be captured in a shareable link, and if not, why.
 */
export enum ExpandedDocLinkability {
  Linkable = 'Linkable',
  /** The ES|QL query does not request `_id` and `_index`, so its rows have no stable identity */
  EsqlMissingMetadata = 'EsqlMissingMetadata',
  /** The ES|QL query derives its rows, so they do not correspond to documents that can be refetched */
  EsqlTransformational = 'EsqlTransformational',
}

/**
 * Determines whether the documents a query returns are deep linkable.
 *
 * Data view queries always are, since every document has an `_id` and `_index`. ES|QL only
 * qualifies when the query asks for those via `METADATA` and does not transform its rows, and
 * both must hold: a transformational query can still carry `_id` through (e.g. via `KEEP`) while
 * producing rows that cannot be resolved back to a document.
 */
export const getExpandedDocLinkability = (
  query: Query | AggregateQuery | undefined
): ExpandedDocLinkability => {
  if (!isOfAggregateQueryType(query)) {
    return ExpandedDocLinkability.Linkable;
  }

  if (hasTransformationalCommand(query.esql)) {
    return ExpandedDocLinkability.EsqlTransformational;
  }

  const metadataColumns = retrieveMetadataColumns(query.esql);

  return metadataColumns.includes('_id') && metadataColumns.includes('_index')
    ? ExpandedDocLinkability.Linkable
    : ExpandedDocLinkability.EsqlMissingMetadata;
};
