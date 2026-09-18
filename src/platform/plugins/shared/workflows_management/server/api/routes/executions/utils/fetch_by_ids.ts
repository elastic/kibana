/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { MAX_RUN_WORKFLOW_DOCS } from '@kbn/workflows';
import type { DocumentSelection } from '../../../../../common/types/document_types';

export interface FetchedSource {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
}

export interface FetchedFields {
  _id: string;
  _index: string;
  /** Dotted field paths to array values, as returned by the `fields` API. */
  fields: Record<string, unknown>;
}

const assertWithinRunLimit = (count: number, plural: string) => {
  if (count > MAX_RUN_WORKFLOW_DOCS) {
    throw new Error(
      `Cannot run a workflow on more than ${MAX_RUN_WORKFLOW_DOCS} ${plural} (received ${count}).`
    );
  }
};

const selectionKey = ({ _id, _index }: DocumentSelection) => `${_index}\u0000${_id}`;

/**
 * Fetches the `_source` of each selected alert in a single `mget`.
 *
 * Alerts are read as `_source` because the alerting framework's `formatAlert` and
 * `expandFlattenedAlert` both operate on the stored document.
 *
 * The caller must pass an `asCurrentUser` client so the read stays scoped to the requesting
 * user's index privileges and space. Pairs that resolve to nothing are logged and skipped rather
 * than failing the whole batch — a selection can legitimately reference an alert that was
 * deleted between selection and run.
 */
export const fetchAlertSourcesByIds = async ({
  selections,
  esClient,
  logger,
}: {
  selections: DocumentSelection[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<FetchedSource[]> => {
  if (selections.length === 0) {
    return [];
  }

  assertWithinRunLimit(selections.length, 'alerts');

  try {
    const response = await esClient.mget<Record<string, unknown>>({
      docs: selections.map(({ _id, _index }) => ({ _id, _index })),
    });

    const alerts: FetchedSource[] = [];
    for (const doc of response.docs) {
      if ('found' in doc && doc.found && '_source' in doc && doc._source) {
        alerts.push({ _id: doc._id, _index: doc._index, _source: doc._source });
      } else {
        logger.warn(`Alert not found: ${doc._id} in index ${doc._index}`);
      }
    }

    return alerts;
  } catch (error) {
    logger.error(
      `Failed to fetch alerts: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
};

/**
 * Fetches the mapped fields of each selected document with a single `fields: ['*']` search.
 *
 * Deliberately not `mget`: every client that embedded documents itself sent dotted field paths
 * with array values, derived from the `fields` API. Reading `_source` instead would hand
 * workflows nested objects and scalars, silently breaking any expression written against the
 * embedded shape, and would drop runtime fields entirely.
 *
 * The caller must pass an `asCurrentUser` client so the read stays scoped to the requesting
 * user's index privileges and space. Pairs that resolve to nothing are logged and skipped rather
 * than failing the whole batch — a selection can legitimately reference a document that was
 * deleted between selection and run.
 */
export const fetchDocumentFieldsByIds = async ({
  selections,
  esClient,
  logger,
}: {
  selections: DocumentSelection[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<FetchedFields[]> => {
  if (selections.length === 0) {
    return [];
  }

  assertWithinRunLimit(selections.length, 'documents');

  const requested = new Set(selections.map(selectionKey));

  try {
    const response = await esClient.search<never>({
      index: [...new Set(selections.map(({ _index }) => _index))],
      size: selections.length,
      _source: false,
      fields: ['*'],
      query: { ids: { values: [...new Set(selections.map(({ _id }) => _id))] } },
      ignore_unavailable: true,
    });

    const documents: FetchedFields[] = [];
    const found = new Set<string>();
    // `_id` is optional on the client's hit type even though a concrete search hit always has one.
    const identifiedHits = response.hits.hits.filter(
      (hit): hit is typeof hit & { _id: string } => hit._id !== undefined
    );
    for (const hit of identifiedHits) {
      const key = selectionKey({ _id: hit._id, _index: hit._index });
      // An `ids` query spans every selected index, so it can match an id in an index the user
      // did not select. Keep only the pairs that were actually asked for.
      if (requested.has(key)) {
        found.add(key);
        documents.push({ _id: hit._id, _index: hit._index, fields: hit.fields ?? {} });
      }
    }

    for (const selection of selections) {
      if (!found.has(selectionKey(selection))) {
        logger.warn(`Document not found: ${selection._id} in index ${selection._index}`);
      }
    }

    return documents;
  } catch (error) {
    logger.error(
      `Failed to fetch documents: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
};
