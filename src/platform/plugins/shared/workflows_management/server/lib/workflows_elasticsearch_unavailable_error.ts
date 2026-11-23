/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A managed install failed on a transient Elasticsearch error and was not retried, or ran out of
 * retries. Answers with 503 where a route surfaces it; `cause` is the Elasticsearch error.
 */
export class WorkflowsElasticsearchUnavailableError extends Error {
  public readonly statusCode = 503;

  constructor(cause: Error) {
    super(`Workflows could not reach Elasticsearch, try again: ${cause.message}`, { cause });
    this.name = 'WorkflowsElasticsearchUnavailableError';
  }
}
