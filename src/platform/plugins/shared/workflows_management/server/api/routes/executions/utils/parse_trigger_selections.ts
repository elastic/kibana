/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRecord } from '@kbn/workflows-yaml';
import { assertWithinRunLimit } from './fetch_by_ids';
import type { DocumentSelection } from '../../../../../common/types/document_types';
import { WorkflowTriggerInputError } from '../../../workflow_trigger_input_error';

/** The compact selections the server knows how to expand, named after their `event` key. */
export type TriggerSelectionKind = 'alertIds' | 'documentIds';

/** Elasticsearch rejects document ids longer than 512 bytes. */
const MAX_DOCUMENT_ID_BYTES = 512;
/** Elasticsearch rejects index names longer than 255 bytes. */
const MAX_INDEX_NAME_BYTES = 255;

/** What each selection kind selects, as named in the run-limit error message. */
const SELECTION_PLURALS: Record<TriggerSelectionKind, string> = {
  alertIds: 'alerts',
  documentIds: 'documents',
};

const isBoundedString = (value: unknown, maxBytes: number): value is string =>
  typeof value === 'string' && value.length > 0 && Buffer.byteLength(value, 'utf8') <= maxBytes;

/**
 * An `_index` must name one target: an index, alias, or data stream. Wildcards, lists, `_all`, and
 * exclusions would let a single pair reach documents in targets the caller never named.
 */
const isMultiTargetExpression = (index: string): boolean =>
  index === '_all' || index.startsWith('-') || index.includes('*') || index.includes(',');

/**
 * Validates a compact `event.alertIds` or `event.documentIds` selection, the only check on its
 * shape before it reaches Elasticsearch since the run routes accept `inputs` as an open record.
 */
export const parseTriggerSelections = ({
  value,
  kind,
}: {
  value: unknown;
  kind: TriggerSelectionKind;
}): DocumentSelection[] => {
  if (!Array.isArray(value)) {
    throw new WorkflowTriggerInputError(`inputs.event.${kind} must be an array.`);
  }

  assertWithinRunLimit(value.length, SELECTION_PLURALS[kind]);

  return value.map((entry) => {
    const record = isRecord(entry) ? entry : undefined;
    const _id = record?._id;
    const _index = record?._index;

    if (
      !isBoundedString(_id, MAX_DOCUMENT_ID_BYTES) ||
      !isBoundedString(_index, MAX_INDEX_NAME_BYTES)
    ) {
      throw new WorkflowTriggerInputError(
        `Every inputs.event.${kind} entry must be an object with non-empty string "_id" (max ${MAX_DOCUMENT_ID_BYTES} bytes) and "_index" (max ${MAX_INDEX_NAME_BYTES} bytes) properties.`
      );
    }
    if (isMultiTargetExpression(_index)) {
      throw new WorkflowTriggerInputError(
        `inputs.event.${kind} "_index" must name a single index, alias, or data stream (received "${_index}").`
      );
    }
    return { _id, _index };
  });
};
