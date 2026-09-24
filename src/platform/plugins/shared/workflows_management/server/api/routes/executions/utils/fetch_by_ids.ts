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
import { WorkflowTriggerInputError } from '../../../workflow_trigger_input_error';

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

export const assertWithinRunLimit = (count: number, plural: string): void => {
  if (count > MAX_RUN_WORKFLOW_DOCS) {
    throw new WorkflowTriggerInputError(
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
 * Deliberately not `mget`: reading through the `fields` API yields dotted field paths with array
 * values, the shape the Security tables embed today, and includes runtime fields defined in the
 * index mappings. Runtime fields that exist only on a Kibana data view are not included — the
 * server has no data view to read them from.
 *
 * Each index gets its own `ids` clause so the query matches exactly the requested pairs. A single
 * `ids` query over every selected index would also match an id in an index it was not selected
 * for, and those extra hits would compete for the `size` window with the pairs actually asked for.
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
  const idsByIndex = new Map<string, Set<string>>();
  for (const { _id, _index } of selections) {
    const ids = idsByIndex.get(_index) ?? new Set<string>();
    ids.add(_id);
    idsByIndex.set(_index, ids);
  }

  try {
    const response = await esClient.search<never>({
      index: [...idsByIndex.keys()],
      size: requested.size,
      _source: false,
      fields: ['*'],
      query: {
        bool: {
          should: [...idsByIndex].map(([index, ids]) => ({
            bool: { filter: [{ term: { _index: index } }, { ids: { values: [...ids] } }] },
          })),
          minimum_should_match: 1,
        },
      },
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
      // A hit reported under a different index name than the one selected (e.g. the concrete
      // index behind an alias) is not the pair that was asked for. Keep only exact pairs.
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
