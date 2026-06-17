/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createIndexes } from './create_indexes';
import {
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from './step_executions_index';
import { WORKFLOWS_EXECUTIONS_INDEX } from './workflow_executions_index';

jest.mock('./create_index', () => ({
  setupRolloverIndex: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setupRolloverIndex } = require('./create_index');

describe('createIndexes', () => {
  const esClient = {} as any;
  const logger = { debug: jest.fn(), error: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets up rollover for both workflow indices', async () => {
    await createIndexes({ esClient, rolloverMaxAge: '1h', logger });

    expect(setupRolloverIndex).toHaveBeenCalledTimes(2);
    expect(setupRolloverIndex).toHaveBeenCalledWith(
      expect.objectContaining({ aliasName: WORKFLOWS_EXECUTIONS_INDEX })
    );
    expect(setupRolloverIndex).toHaveBeenCalledWith(
      expect.objectContaining({ aliasName: WORKFLOWS_STEP_EXECUTIONS_INDEX })
    );
  });

  it('passes esClient and logger to both calls', async () => {
    await createIndexes({ esClient, rolloverMaxAge: '1h', logger });

    expect(setupRolloverIndex).toHaveBeenCalledWith(expect.objectContaining({ esClient, logger }));
    expect(setupRolloverIndex).toHaveBeenCalledWith(expect.objectContaining({ esClient, logger }));
  });

  it('forwards WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS to the step-executions index unchanged', async () => {
    await createIndexes({ esClient, rolloverMaxAge: '1h', logger });

    const stepCall = setupRolloverIndex.mock.calls.find(
      ([arg]: [{ aliasName: string }]) => arg.aliasName === WORKFLOWS_STEP_EXECUTIONS_INDEX
    );
    expect(stepCall).toBeDefined();
    const [{ mappings }] = stepCall;
    expect(mappings).toBe(WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS);
  });
});
