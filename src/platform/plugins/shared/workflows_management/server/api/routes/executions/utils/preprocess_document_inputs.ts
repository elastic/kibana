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
import { fetchDocumentFieldsByIds } from './fetch_by_ids';
import { parseTriggerSelections } from './parse_trigger_selections';
import type { ExpandedDocument } from '../../../../../common/types/document_types';
import { WorkflowTriggerInputError } from '../../../workflow_trigger_input_error';
import type { AlertPreprocessingContext } from '../../../workflows_management_api';

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

  const selections = parseTriggerSelections({ value: documentIds, kind: 'documentIds' });
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
