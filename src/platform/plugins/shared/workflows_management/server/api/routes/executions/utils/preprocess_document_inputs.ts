/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash';
import type { Logger } from '@kbn/core/server';
import { assertWithinRunLimit, fetchDocumentFieldsByIds } from './fetch_by_ids';
import type {
  DocumentSelection,
  ExpandedDocument,
} from '../../../../../common/types/document_types';
import { WorkflowTriggerInputError } from '../../../workflow_trigger_input_error';
import type { AlertPreprocessingContext } from '../../../workflows_management_api';

/** Elasticsearch rejects document ids longer than 512 bytes. */
const MAX_DOCUMENT_ID_BYTES = 512;
/** Elasticsearch rejects index names longer than 255 bytes. */
const MAX_INDEX_NAME_BYTES = 255;

const isBoundedString = (value: unknown, maxBytes: number): value is string =>
  typeof value === 'string' && value.length > 0 && Buffer.byteLength(value, 'utf8') <= maxBytes;

/**
 * Validates `event.documentIds` before anything reaches Elasticsearch. The run routes accept
 * `inputs` as an open record, so this is the only place the selection's shape is checked.
 */
const parseDocumentSelections = (documentIds: unknown): DocumentSelection[] => {
  if (!Array.isArray(documentIds)) {
    throw new WorkflowTriggerInputError('inputs.event.documentIds must be an array.');
  }

  assertWithinRunLimit(documentIds.length, 'documents');

  return documentIds.map((entry) => {
    const record = isPlainObject(entry) ? (entry as Record<string, unknown>) : undefined;
    const _id = record?._id;
    const _index = record?._index;
    if (
      !isBoundedString(_id, MAX_DOCUMENT_ID_BYTES) ||
      !isBoundedString(_index, MAX_INDEX_NAME_BYTES)
    ) {
      throw new WorkflowTriggerInputError(
        'Every inputs.event.documentIds entry must be an object with non-empty string "_id" and "_index" properties.'
      );
    }
    return { _id, _index };
  });
};

/**
 * Expands a compact `event.documentIds` selection into the `event.documents` array workflows
 * already consume.
 *
 * Each expanded document has the `{ _id, _index, 'dotted.field': [value] }` shape produced by the
 * `fields` API. Inputs without `documentIds` pass through untouched, which keeps callers that
 * still send full documents working.
 */
export async function preprocessDocumentInputs(
  inputs: Record<string, unknown>,
  context: AlertPreprocessingContext,
  logger: Logger
): Promise<Record<string, unknown>> {
  const event = isPlainObject(inputs.event) ? (inputs.event as Record<string, unknown>) : undefined;
  if (!event || event.triggerType !== 'document' || event.documentIds == null) {
    return inputs;
  }

  const { documentIds, ...restOfEvent } = event;

  if (restOfEvent.documents !== undefined) {
    throw new WorkflowTriggerInputError(
      'inputs.event.documents and inputs.event.documentIds cannot be sent together.'
    );
  }

  const selections = parseDocumentSelections(documentIds);
  if (selections.length === 0) {
    return inputs;
  }

  logger.debug(`Preprocessing ${selections.length} document(s) for workflow execution`);

  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const fetched = await fetchDocumentFieldsByIds({ selections, esClient, logger });

  if (fetched.length === 0) {
    throw new WorkflowTriggerInputError('No documents found with the provided IDs');
  }

  const documents: ExpandedDocument[] = fetched.map(({ _id, _index, fields }) => ({
    ...fields,
    _id,
    _index,
  }));

  // `documentIds` is dropped from the outgoing event: it has served its purpose and leaving it
  // in place would let a step read a selection that may not match the expanded `documents`.
  return {
    ...inputs,
    event: {
      ...restOfEvent,
      documents,
    },
  };
}
