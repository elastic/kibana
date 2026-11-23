/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { WorkflowsElasticsearchUnavailableError } from './workflows_elasticsearch_unavailable_error';

describe('WorkflowsElasticsearchUnavailableError', () => {
  it('answers with 503 and keeps the Elasticsearch error as its cause', () => {
    const cause = new errors.ConnectionError('socket hang up');
    const error = new WorkflowsElasticsearchUnavailableError(cause);

    expect(error.statusCode).toBe(503);
    expect(error.cause).toBe(cause);
    expect(error.message).toBe(
      'Workflows could not reach Elasticsearch, try again: socket hang up'
    );
  });
});
