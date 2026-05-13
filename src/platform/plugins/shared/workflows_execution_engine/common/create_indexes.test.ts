/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createIndexes } from './create_indexes';

jest.mock('./create_index', () => ({
  createOrUpdateIndex: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createOrUpdateIndex } = require('./create_index');

describe('createIndexes', () => {
  const esClient = {} as any;
  const logger = { debug: jest.fn(), error: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses createOrUpdateIndex for both execution and step execution indexes so additive mapping changes flow into existing installations on start', async () => {
    // Regression: previously the step execution index used the
    // one-shot `createIndexWithMappings`, which short-circuits when the
    // index already exists. New fields (e.g. the HITL audit trio
    // `respondedBy`/`respondedAt`/`channel` for inbox multi-client
    // safety) therefore couldn't be added without a manual reindex.
    await createIndexes({ esClient, logger });

    expect(createOrUpdateIndex).toHaveBeenCalledWith(
      expect.objectContaining({ indexName: '.workflows-executions', esClient, logger })
    );
    expect(createOrUpdateIndex).toHaveBeenCalledWith(
      expect.objectContaining({ indexName: '.workflows-step-executions', esClient, logger })
    );
    expect(createOrUpdateIndex).toHaveBeenCalledTimes(2);
  });
});
