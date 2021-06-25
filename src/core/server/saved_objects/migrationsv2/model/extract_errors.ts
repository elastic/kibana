/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TransformErrorObjects } from '../../migrations/core';

/**
 * Constructs migration failure message strings from corrupt document ids and document transformation errors
 */
export function extractTransformFailuresReason(
  corruptDocumentIds: string[],
  transformErrors: TransformErrorObjects[]
): string {
  const corruptDocumentIdReason =
    corruptDocumentIds.length > 0
      ? ` ${
          corruptDocumentIds.length
        } corrupt saved object documents were found: ${corruptDocumentIds.join(',')}`
      : '';
  // we have both the saved object Id and the stack trace in each `transformErrors` item.
  const transformErrorsReason =
    transformErrors.length > 0
      ? ` ${transformErrors.length} transformation errors were encountered:\n ` +
        transformErrors
          .map((errObj) => `- ${errObj.rawId}: ${errObj.err.stack ?? errObj.err.message}\n`)
          .join('')
      : '';
  return (
    `Migrations failed. Reason:${corruptDocumentIdReason}${transformErrorsReason}\n` +
    `To allow migrations to proceed, please delete or fix these documents.`
  );
}

export function extractUnknownDocFailureReason(
  unknownDocIds: string[],
  sourceIndex: string
): string {
  return (
    `Migration failed because documents from unknown types were found. ` +
    `To proceed with the migration, please delete these documents from the "${sourceIndex}" index.\n` +
    `The unknown documents were:\n` +
    unknownDocIds.map((docId) => `- "${docId}"\n`).join('') +
    `You can delete them using the following command:\n` +
    `curl -X POST "{elasticsearch}/${sourceIndex}/_bulk?pretty" -H 'Content-Type: application/json' -d'\n` +
    unknownDocIds.map((docId) => `{ "delete" : { "_id" : "${docId}" } }\n`).join('') +
    `'`
  );
}
