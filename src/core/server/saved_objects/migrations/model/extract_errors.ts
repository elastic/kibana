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

/**
 * Constructs migration failure message and logs message strings when an unsupported cluster routing allocation is configured.
 * // note: "[unsupported_cluster_routing_allocation] The elasticsearch cluster has cluster routing allocation incorrectly set for migrations to continue." is the left.message from initialize_action
 */
export const fatalReasonClusterRoutingAllocationUnsupported = ({
  errorMessage,
  docSectionLink,
}: {
  errorMessage: string;
  docSectionLink: string;
}) => ({
  fatalReason: `${errorMessage} To proceed, please remove the cluster routing allocation settings with PUT /_cluster/settings {"transient": {"cluster.routing.allocation.enable": null}, "persistent": {"cluster.routing.allocation.enable": null}}. Refer to ${docSectionLink} for more information on how to resolve the issue.`,
  logsErrorMessage: `${errorMessage} Ensure that the persistent and transient Elasticsearch configuration option 'cluster.routing.allocation.enable' is not set or set it to a value of 'all'. Refer to ${docSectionLink} for more information on how to resolve the issue.`,
});
