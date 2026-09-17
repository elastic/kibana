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
import { getAnySourceCommandFromESQLQuery, hasTransformationalCommand } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';

/**
 * Identifies a document in a shareable link. Keeping `_id`, `_index`, and optional
 * `_routing` separate supports direct querying and maps to document metadata.
 */
export interface ExpandedDocRef extends SerializableRecord {
  id: string;
  index: string;
  routing?: string;
}

/** Builds a reference when the record has the `_id` and `_index` needed for a stable identity. */
export const getExpandedDocRef = (doc: DataTableRecord | undefined): ExpandedDocRef | undefined => {
  const { _id: id, _index: index, _routing: routing } = doc?.raw ?? {};

  return id && index ? { id, index, ...(routing ? { routing } : {}) } : undefined;
};

/** Matches a record against a reference, comparing the raw fields. */
export const matchesExpandedDocRef = (doc: DataTableRecord, ref: ExpandedDocRef) =>
  doc.raw._id === ref.id &&
  doc.raw._index === ref.index &&
  (ref.routing === undefined || doc.raw._routing === ref.routing);

/**
 * Whether documents returned by a query can be captured in a shareable link, and if not, why.
 */
export enum ExpandedDocLinkability {
  Linkable = 'Linkable',
  /** Only FROM and TS queries support refetching individual documents */
  EsqlUnsupportedSource = 'EsqlUnsupportedSource',
  /** The ES|QL query does not request `_id` and `_index`, so its rows have no stable identity */
  EsqlMissingMetadata = 'EsqlMissingMetadata',
  /** The ES|QL query derives its rows, so they do not correspond to documents that can be refetched */
  EsqlTransformational = 'EsqlTransformational',
}

/** Whether the ES|QL source command supports linking to individual documents. */
export const isEsqlSourceCommandLinkable = (esql: string): boolean => {
  const sourceCommand = getAnySourceCommandFromESQLQuery(esql);
  return sourceCommand === 'FROM' || sourceCommand === 'TS';
};

/**
 * Determines whether a document is deep linkable. Transformational ES|QL rows cannot be reliably refetched,
 * and metadata is checked directly on the document instance because query edits do not change open rows.
 */
export const getExpandedDocLinkability = (
  query: Query | AggregateQuery | undefined,
  doc: DataTableRecord | undefined
): ExpandedDocLinkability => {
  if (!isOfAggregateQueryType(query)) {
    return ExpandedDocLinkability.Linkable;
  }

  if (!isEsqlSourceCommandLinkable(query.esql)) {
    return ExpandedDocLinkability.EsqlUnsupportedSource;
  }

  if (hasTransformationalCommand(query.esql)) {
    return ExpandedDocLinkability.EsqlTransformational;
  }

  return getExpandedDocRef(doc)
    ? ExpandedDocLinkability.Linkable
    : ExpandedDocLinkability.EsqlMissingMetadata;
};

/** Returns the shared explanation for a document-link restriction. */
export const getExpandedDocLinkDisabledReason = (
  linkability: ExpandedDocLinkability
): string | undefined => {
  switch (linkability) {
    case ExpandedDocLinkability.EsqlUnsupportedSource:
      return i18n.translate('discover.expandedDoc.esqlUnsupportedSourceDescription', {
        defaultMessage: 'Links to individual results are only available for FROM and TS queries.',
      });
    case ExpandedDocLinkability.EsqlMissingMetadata:
      return i18n.translate('discover.expandedDoc.esqlMissingMetadataDescription', {
        defaultMessage: 'Add "METADATA _id, _index" to your query to link to individual results.',
      });
    case ExpandedDocLinkability.EsqlTransformational:
      return i18n.translate('discover.expandedDoc.esqlTransformationalDescription', {
        defaultMessage:
          'Links to individual results are unavailable for queries that transform rows, such as STATS or KEEP.',
      });
    default:
      return undefined;
  }
};
