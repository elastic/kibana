/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TransformErrorObjects } from '../core';
import type { DocumentIdAndType } from '../actions';

/**
 * Constructs migration failure message strings from corrupt document ids and document transformation errors
 */
export function extractTransformFailuresReason(
  resolveMigrationFailuresUrl: string,
  corruptDocumentIds: string[],
  transformErrors: TransformErrorObjects[]
): string {
  const corruptDocumentIdReason =
    corruptDocumentIds.length > 0
      ? ` ${
          corruptDocumentIds.length
        } corrupt saved object documents were found: ${corruptDocumentIds.join(', ')}\n`
      : '';
  // we have both the saved object Id and the stack trace in each `transformErrors` item.
  const transformErrorsReason =
    transformErrors.length > 0
      ? ` ${transformErrors.length} transformation errors were encountered:\n` +
        transformErrors
          .map((errObj) => `- ${errObj.rawId}: ${errObj.err.stack ?? errObj.err.message}\n`)
          .join('')
      : '';
  return (
    `Migrations failed. Reason:${corruptDocumentIdReason}${transformErrorsReason}\n` +
    `To allow migrations to proceed, please delete or fix these documents.\n` +
    `Note that you can configure Kibana to automatically discard corrupt documents and transform errors for this migration.\n` +
    `Please refer to ${resolveMigrationFailuresUrl} for more information.`
  );
}

export function extractDiscardedUnknownDocs(unknownDocs: DocumentIdAndType[]): string {
  return (
    `Kibana has been configured to discard unknown documents for this migration.\n` +
    `Therefore, the following documents with unknown types will not be taken into account and they will not be available after the migration:\n` +
    unknownDocs.map((doc) => `- "${doc.id}" (type: "${doc.type}")\n`).join('')
  );
}

export function extractUnknownDocFailureReason(
  resolveMigrationFailuresUrl: string,
  unknownDocs: DocumentIdAndType[]
): string {
  return (
    `Migration failed because some documents were found which use unknown saved object types:\n` +
    unknownDocs.map((doc) => `- "${doc.id}" (type: "${doc.type}")\n`).join('') +
    `\nTo proceed with the migration you can configure Kibana to discard unknown saved objects for this migration.\n` +
    `Please refer to ${resolveMigrationFailuresUrl} for more information.`
  );
}

export function extractDiscardedCorruptDocs(
  corruptDocumentIds: string[],
  transformErrors: TransformErrorObjects[]
): string {
  return (
    `Kibana has been configured to discard corrupt documents and documents that cause transform errors for this migration.\n` +
    `Therefore, the following documents will not be taken into account and they will not be available after the migration:\n` +
    corruptDocumentIds.map((id) => `- "${id}" (corrupt)\n`).join('') +
    transformErrors.map((error) => `- "${error.rawId}" (${error.err.message})\n`).join('')
  );
}

/**
 * Constructs migration failure message string for doc exceeds max batch size in bytes
 */
export const fatalReasonDocumentExceedsMaxBatchSizeBytes = ({
  _id,
  docSizeBytes,
  maxBatchSizeBytes,
}: {
  _id: string;
  docSizeBytes: number;
  maxBatchSizeBytes: number;
}) =>
  `The document with _id "${_id}" is ${docSizeBytes} bytes which exceeds the configured maximum batch size of ${maxBatchSizeBytes} bytes. To proceed, please increase the 'migrations.maxBatchSizeBytes' Kibana configuration option and ensure that the Elasticsearch 'http.max_content_length' configuration option is set to an equal or larger value.`;
