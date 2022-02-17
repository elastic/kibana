/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TransformErrorObjects } from '../core';
import { CheckForUnknownDocsFoundDoc } from '../actions';

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
  unknownDocs: CheckForUnknownDocsFoundDoc[],
  sourceIndex: string
): string {
  return (
    `Migration failed because documents were found for unknown saved object types. ` +
    `To proceed with the migration, please delete these documents from the "${sourceIndex}" index.\n` +
    `The documents with unknown types are:\n` +
    unknownDocs.map((doc) => `- "${doc.id}" (type: "${doc.type}")\n`).join('') +
    `You can delete them using the following command:\n` +
    `curl -X POST "{elasticsearch}/${sourceIndex}/_bulk?pretty" -H 'Content-Type: application/json' -d'\n` +
    unknownDocs.map((doc) => `{ "delete" : { "_id" : "${doc.id}" } }\n`).join('') +
    `'`
  );
}
