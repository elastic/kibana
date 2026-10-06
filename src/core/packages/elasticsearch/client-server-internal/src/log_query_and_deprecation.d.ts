/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiagnosticResult, Client } from '@elastic/elasticsearch';
import type { errors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchApiToRedactInLogs } from '@kbn/core-elasticsearch-server';
/**
 * The logger-relevant request meta of an ES request
 */
export interface RequestDebugMeta {
  /**
   * The requested method
   */
  method: string;
  /**
   * The requested endpoint + querystring
   */
  url: string;
  /**
   * The request body (it may be redacted)
   */
  body: string;
  /**
   * The status code of the response
   */
  statusCode: number | null;
}
/**
 * Returns a debug message from an Elasticsearch error in the following format:
 * [error type] error reason
 */
export declare function getErrorMessage(error: errors.ElasticsearchClientError): string;
/**
 * Returns stringified debug information from an Elasticsearch request event
 * useful for logging in case of an unexpected failure.
 */
export declare function getRequestDebugMeta(
  event: DiagnosticResult,
  apisToRedactInLogs?: ElasticsearchApiToRedactInLogs[]
): RequestDebugMeta;
export declare const instrumentEsQueryAndDeprecationLogger: ({
  logger,
  client,
  type,
  apisToRedactInLogs,
}: {
  logger: Logger;
  client: Client;
  type: string;
  apisToRedactInLogs: ElasticsearchApiToRedactInLogs[];
}) => void;
