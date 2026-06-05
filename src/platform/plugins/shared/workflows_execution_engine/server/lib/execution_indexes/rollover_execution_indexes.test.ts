/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../../common';
import {
  rolloverExecutionIndexIfRequired,
  rolloverWorkflowExecutionIndexes,
} from './rollover_execution_indexes';

const CONDITIONS = { maxAge: '1m', maxPrimaryShardSize: '1gb' };

const createEsClientMock = () => ({
  indices: {
    existsAlias: jest.fn(),
    rollover: jest.fn(),
  },
});

const createLoggerMock = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
});

describe('rolloverExecutionIndexIfRequired', () => {
  it('skips rollover when the alias does not exist', async () => {
    const esClient = createEsClientMock();
    esClient.indices.existsAlias.mockResolvedValue(false);
    const logger = createLoggerMock();

    const rolledOver = await rolloverExecutionIndexIfRequired({
      esClient: esClient as any,
      aliasName: WORKFLOWS_EXECUTIONS_INDEX,
      conditions: CONDITIONS,
      logger: logger as any,
    });

    expect(rolledOver).toBe(false);
    expect(esClient.indices.rollover).not.toHaveBeenCalled();
  });

  it('calls rollover with max_age and max_primary_shard_size conditions', async () => {
    const esClient = createEsClientMock();
    esClient.indices.existsAlias.mockResolvedValue(true);
    esClient.indices.rollover.mockResolvedValue({ rolled_over: false });
    const logger = createLoggerMock();

    await rolloverExecutionIndexIfRequired({
      esClient: esClient as any,
      aliasName: WORKFLOWS_EXECUTIONS_INDEX,
      conditions: CONDITIONS,
      logger: logger as any,
    });

    expect(esClient.indices.rollover).toHaveBeenCalledWith(
      {
        alias: WORKFLOWS_EXECUTIONS_INDEX,
        conditions: {
          max_age: '1m',
          max_primary_shard_size: '1gb',
        },
      },
      { signal: undefined }
    );
  });

  it('returns true when Elasticsearch rolls over the write index', async () => {
    const esClient = createEsClientMock();
    esClient.indices.existsAlias.mockResolvedValue(true);
    esClient.indices.rollover.mockResolvedValue({
      rolled_over: true,
      old_index: '.workflows-executions-000001',
      new_index: '.workflows-executions-000002',
    });
    const logger = createLoggerMock();

    const rolledOver = await rolloverExecutionIndexIfRequired({
      esClient: esClient as any,
      aliasName: WORKFLOWS_EXECUTIONS_INDEX,
      conditions: CONDITIONS,
      logger: logger as any,
    });

    expect(rolledOver).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Rolled over alias .workflows-executions')
    );
  });
});

describe('rolloverWorkflowExecutionIndexes', () => {
  it('evaluates rollover for workflow and step execution aliases', async () => {
    const esClient = createEsClientMock();
    esClient.indices.existsAlias.mockResolvedValue(true);
    esClient.indices.rollover.mockResolvedValue({ rolled_over: false });
    const logger = createLoggerMock();

    await rolloverWorkflowExecutionIndexes({
      esClient: esClient as any,
      conditions: CONDITIONS,
      logger: logger as any,
    });

    expect(esClient.indices.rollover).toHaveBeenCalledTimes(2);
    expect(esClient.indices.rollover).toHaveBeenCalledWith(
      expect.objectContaining({ alias: WORKFLOWS_EXECUTIONS_INDEX }),
      expect.any(Object)
    );
    expect(esClient.indices.rollover).toHaveBeenCalledWith(
      expect.objectContaining({ alias: WORKFLOWS_STEP_EXECUTIONS_INDEX }),
      expect.any(Object)
    );
  });

  it('continues with the second alias when the first rollover throws', async () => {
    const esClient = createEsClientMock();
    esClient.indices.existsAlias.mockResolvedValue(true);
    esClient.indices.rollover
      .mockRejectedValueOnce(new Error('rollover failed'))
      .mockResolvedValueOnce({ rolled_over: false });
    const logger = createLoggerMock();

    await rolloverWorkflowExecutionIndexes({
      esClient: esClient as any,
      conditions: CONDITIONS,
      logger: logger as any,
    });

    expect(esClient.indices.rollover).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(WORKFLOWS_EXECUTIONS_INDEX));
  });
});
