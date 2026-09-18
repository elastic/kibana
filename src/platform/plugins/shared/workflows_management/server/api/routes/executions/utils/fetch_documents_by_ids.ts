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

export interface FetchedDocument {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
}

/**
 * Fetches the selected `(id, index)` pairs in a single `mget`.
 *
 * The caller must pass an `asCurrentUser` client so the read stays scoped to the requesting
 * user's index privileges and space. Pairs that resolve to nothing are logged and skipped rather
 * than failing the whole batch — a selection can legitimately reference a document that was
 * deleted between selection and run.
 */
export const fetchDocumentsByIds = async ({
  selections,
  esClient,
  logger,
  entityName,
}: {
  selections: DocumentSelection[];
  esClient: ElasticsearchClient;
  logger: Logger;
  /** Capitalized singular used in log messages, e.g. `Alert` or `Document`. */
  entityName: 'Alert' | 'Document';
}): Promise<FetchedDocument[]> => {
  if (selections.length === 0) {
    return [];
  }

  const plural = `${entityName.toLowerCase()}s`;

  if (selections.length > MAX_RUN_WORKFLOW_DOCS) {
    throw new Error(
      `Cannot run a workflow on more than ${MAX_RUN_WORKFLOW_DOCS} ${plural} (received ${selections.length}).`
    );
  }

  try {
    const response = await esClient.mget<Record<string, unknown>>({
      docs: selections.map(({ _id, _index }) => ({ _id, _index })),
    });

    const documents: FetchedDocument[] = [];
    for (const doc of response.docs) {
      if ('found' in doc && doc.found && '_source' in doc && doc._source) {
        documents.push({ _id: doc._id, _index: doc._index, _source: doc._source });
      } else {
        logger.warn(`${entityName} not found: ${doc._id} in index ${doc._index}`);
      }
    }

    return documents;
  } catch (error) {
    logger.error(
      `Failed to fetch ${plural}: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
};
