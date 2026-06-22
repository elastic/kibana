/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  rolloverExecutionIndexIfRequired,
  rolloverWorkflowExecutionIndexes,
} from './rollover_execution_indexes';
import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../../common';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../../../common/workflow_executions_index';

const CONDITIONS = { maxAge: '1m', maxPrimaryShardSize: '1gb' };

const createEsClientMock = () => ({
  indices: {
    getAlias: jest.fn(),
    rollover: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    updateAliases: jest.fn(),
  },
});

const createLoggerMock = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
});

describe('rolloverExecutionIndexIfRequired', () => {
  it('returns false when dry-run rollover conditions are not met', async () => {
    const esClient = createEsClientMock();
    esClient.indices.getAlias.mockResolvedValue({
      '.workflows-executions-000001': { aliases: {} },
    });
    esClient.indices.rollover.mockResolvedValue({
      conditions: {},
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

    expect(rolledOver).toBe(false);
    expect(esClient.indices.rollover).toHaveBeenCalledWith(
      {
        alias: WORKFLOWS_EXECUTIONS_INDEX,
        dry_run: true,
        conditions: {
          max_age: '1m',
          max_primary_shard_size: '1gb',
        },
      },
      { signal: undefined }
    );
    expect(esClient.indices.create).not.toHaveBeenCalled();
  });

  it('creates the new backing index and updates aliases when conditions are met', async () => {
    const esClient = createEsClientMock();
    esClient.indices.getAlias.mockResolvedValue({
      '.workflows-executions-000001': { aliases: {} },
    });
    esClient.indices.rollover.mockResolvedValue({
      conditions: { max_age: true },
      old_index: '.workflows-executions-000001',
      new_index: '.workflows-executions-000002',
    });
    esClient.indices.exists.mockResolvedValue(false);
    esClient.indices.create.mockResolvedValue({});
    esClient.indices.updateAliases.mockResolvedValue({});
    const logger = createLoggerMock();

    const rolledOver = await rolloverExecutionIndexIfRequired({
      esClient: esClient as any,
      aliasName: WORKFLOWS_EXECUTIONS_INDEX,
      conditions: CONDITIONS,
      logger: logger as any,
    });

    expect(rolledOver).toBe(true);
    expect(esClient.indices.create).toHaveBeenCalledWith({
      index: '.workflows-executions-000002',
      mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
    });
    expect(esClient.indices.updateAliases).toHaveBeenCalledWith({
      actions: [
        {
          add: {
            index: '.workflows-executions-000002',
            alias: WORKFLOWS_EXECUTIONS_INDEX,
            is_write_index: true,
          },
        },
        {
          add: {
            index: '.workflows-executions-000001',
            alias: WORKFLOWS_EXECUTIONS_INDEX,
            is_write_index: false,
          },
        },
      ],
    });
  });

  it('returns false when the target backing index already exists', async () => {
    const esClient = createEsClientMock();
    esClient.indices.getAlias.mockResolvedValue({
      '.workflows-executions-000001': { aliases: {} },
    });
    esClient.indices.rollover.mockResolvedValue({
      conditions: { max_primary_shard_size: true },
      old_index: '.workflows-executions-000001',
      new_index: '.workflows-executions-000002',
    });
    esClient.indices.exists.mockResolvedValue(true);
    const logger = createLoggerMock();

    const rolledOver = await rolloverExecutionIndexIfRequired({
      esClient: esClient as any,
      aliasName: WORKFLOWS_EXECUTIONS_INDEX,
      conditions: CONDITIONS,
      logger: logger as any,
    });

    expect(rolledOver).toBe(false);
    expect(esClient.indices.create).not.toHaveBeenCalled();
    expect(esClient.indices.updateAliases).not.toHaveBeenCalled();
  });
});

describe('rolloverWorkflowExecutionIndexes', () => {
  it('evaluates rollover for workflow and step execution aliases', async () => {
    const esClient = createEsClientMock();
    esClient.indices.getAlias.mockResolvedValue({
      '.workflows-executions-000001': { aliases: {} },
    });
    esClient.indices.rollover.mockResolvedValue({
      conditions: {},
      old_index: '.workflows-executions-000001',
      new_index: '.workflows-executions-000002',
    });
    const logger = createLoggerMock();

    await rolloverWorkflowExecutionIndexes({
      esClient: esClient as any,
      conditions: CONDITIONS,
      logger: logger as any,
    });

    expect(esClient.indices.getAlias).toHaveBeenCalledTimes(2);
    expect(esClient.indices.getAlias).toHaveBeenCalledWith(
      { name: WORKFLOWS_EXECUTIONS_INDEX },
      { signal: undefined }
    );
    expect(esClient.indices.getAlias).toHaveBeenCalledWith(
      { name: WORKFLOWS_STEP_EXECUTIONS_INDEX },
      { signal: undefined }
    );
    expect(esClient.indices.rollover).toHaveBeenCalledTimes(2);
  });

  it('continues with the second alias when the first rollover throws', async () => {
    const esClient = createEsClientMock();
    esClient.indices.getAlias
      .mockRejectedValueOnce(new Error('rollover failed'))
      .mockResolvedValueOnce({
        '.workflows-step-executions-000001': { aliases: {} },
      });
    esClient.indices.rollover.mockResolvedValue({
      conditions: {},
      old_index: '.workflows-step-executions-000001',
      new_index: '.workflows-step-executions-000002',
    });
    const logger = createLoggerMock();

    await rolloverWorkflowExecutionIndexes({
      esClient: esClient as any,
      conditions: CONDITIONS,
      logger: logger as any,
    });

    expect(esClient.indices.getAlias).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(WORKFLOWS_EXECUTIONS_INDEX));
    expect(esClient.indices.rollover).toHaveBeenCalledTimes(1);
  });
});
