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
  createIndexWithMappings: jest.fn().mockResolvedValue(undefined),
  createOrUpdateIndex: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createIndexWithMappings, createOrUpdateIndex } = require('./create_index');

describe('createIndexes', () => {
  const esClient = {} as any;
  const logger = { debug: jest.fn(), error: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates both execution and step execution indexes', async () => {
    await createIndexes({ esClient, logger });

    expect(createOrUpdateIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        indexName: '.workflows-executions',
      })
    );
    expect(createIndexWithMappings).toHaveBeenCalledWith(
      expect.objectContaining({
        indexName: '.workflows-step-executions',
      })
    );
  });

  it('passes esClient and logger to both calls', async () => {
    await createIndexes({ esClient, logger });

    expect(createOrUpdateIndex).toHaveBeenCalledWith(expect.objectContaining({ esClient, logger }));
    expect(createIndexWithMappings).toHaveBeenCalledWith(
      expect.objectContaining({ esClient, logger })
    );
  });
});
