/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { fetchDocumentsByIds } from './fetch_documents_by_ids';
import type {
  DocumentTriggerInput,
  ExpandedDocument,
} from '../../../../../common/types/document_types';
import type { AlertPreprocessingContext } from '../../../workflows_management_api';

/**
 * Expands a compact `event.documentIds` selection into the `event.documents` array workflows
 * already consume.
 *
 * Each expanded document keeps the `{ _id, _index, ...source }` shape a caller would otherwise
 * embed itself, so a workflow sees no difference between a pre-expanded payload and one the
 * server expanded. Inputs without `documentIds` pass through untouched, which keeps callers that
 * still send full documents working.
 */
export async function preprocessDocumentInputs(
  inputs: Record<string, unknown>,
  context: AlertPreprocessingContext,
  logger: Logger
): Promise<Record<string, unknown>> {
  const event = inputs.event as DocumentTriggerInput['event'] | undefined;
  if (
    !event ||
    event.triggerType !== 'document' ||
    !event.documentIds ||
    event.documentIds.length === 0
  ) {
    return inputs;
  }

  logger.debug(`Preprocessing ${event.documentIds.length} document(s) for workflow execution`);

  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const fetched = await fetchDocumentsByIds({
    selections: event.documentIds,
    esClient,
    logger,
    entityName: 'Document',
  });

  if (fetched.length === 0) {
    throw new Error('No documents found with the provided IDs');
  }

  const documents: ExpandedDocument[] = fetched.map(({ _id, _index, _source }) => ({
    _id,
    _index,
    ..._source,
  }));

  // `documentIds` is dropped from the outgoing event: it has served its purpose and leaving it
  // in place would let a step read a selection that may not match the expanded `documents`.
  const { documentIds, ...restOfEvent } = event;

  return {
    ...inputs,
    event: {
      ...restOfEvent,
      documents,
    },
  };
}
