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
  cleanupExecutionIndexIfEligible,
  cleanupWorkflowExecutionIndexes,
} from './cleanup_execution_indexes';

const OPTIONS = { minIndexAge: '3m' };
const NOW_MS = 1_000_000_000_000;
const OLD_CREATION_MS = NOW_MS - 4 * 60_000;

const createEsClientMock = () => ({
  indices: {
    existsAlias: jest.fn(),
    getAlias: jest.fn(),
    getSettings: jest.fn(),
    delete: jest.fn(),
  },
});

const createLoggerMock = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

describe('cleanupExecutionIndexIfEligible', () => {
  it('skips when the alias does not exist', async () => {
    const esClient = createEsClientMock();
    esClient.indices.existsAlias.mockResolvedValue(false);
    const logger = createLoggerMock();

    const deletedCount = await cleanupExecutionIndexIfEligible({
      esClient: esClient as any,
      aliasName: WORKFLOWS_EXECUTIONS_INDEX,
      options: OPTIONS,
      logger: logger as any,
      nowMs: NOW_MS,
    });

    expect(deletedCount).toBe(0);
    expect(esClient.indices.delete).not.toHaveBeenCalled();
  });

  it('skips the write index and indexes younger than minIndexAge', async () => {
    const esClient = createEsClientMock();
    esClient.indices.existsAlias.mockResolvedValue(true);
    esClient.indices.getAlias.mockResolvedValue({
      '.workflows-executions-000001': {
        aliases: { [WORKFLOWS_EXECUTIONS_INDEX]: { is_write_index: true } },
      },
      '.workflows-executions-000002': {
        aliases: { [WORKFLOWS_EXECUTIONS_INDEX]: {} },
      },
    });
    esClient.indices.getSettings.mockResolvedValue({
      '.workflows-executions-000002': {
        settings: { index: { creation_date: String(NOW_MS - 60_000) } },
      },
    });
    const logger = createLoggerMock();

    const deletedCount = await cleanupExecutionIndexIfEligible({
      esClient: esClient as any,
      aliasName: WORKFLOWS_EXECUTIONS_INDEX,
      options: OPTIONS,
      logger: logger as any,
      nowMs: NOW_MS,
    });

    expect(deletedCount).toBe(0);
    expect(esClient.indices.delete).not.toHaveBeenCalled();
  });

  it('deletes old non-write backing indexes', async () => {
    const esClient = createEsClientMock();
    esClient.indices.existsAlias.mockResolvedValue(true);
    esClient.indices.getAlias.mockResolvedValue({
      '.workflows-executions-000001': {
        aliases: { [WORKFLOWS_EXECUTIONS_INDEX]: { is_write_index: true } },
      },
      '.workflows-executions-000002': {
        aliases: { [WORKFLOWS_EXECUTIONS_INDEX]: {} },
      },
    });
    esClient.indices.getSettings.mockResolvedValue({
      '.workflows-executions-000002': {
        settings: { index: { creation_date: String(OLD_CREATION_MS) } },
      },
    });
    esClient.indices.delete.mockResolvedValue({ acknowledged: true });
    const logger = createLoggerMock();

    const deletedCount = await cleanupExecutionIndexIfEligible({
      esClient: esClient as any,
      aliasName: WORKFLOWS_EXECUTIONS_INDEX,
      options: OPTIONS,
      logger: logger as any,
      nowMs: NOW_MS,
    });

    expect(deletedCount).toBe(1);
    expect(esClient.indices.delete).toHaveBeenCalledWith(
      { index: '.workflows-executions-000002' },
      { signal: undefined }
    );
  });
});

describe('cleanupWorkflowExecutionIndexes', () => {
  it('runs cleanup for workflow and step execution aliases', async () => {
    const esClient = createEsClientMock();
    esClient.indices.existsAlias.mockResolvedValue(false);
    const logger = createLoggerMock();

    await cleanupWorkflowExecutionIndexes({
      esClient: esClient as any,
      options: OPTIONS,
      logger: logger as any,
      nowMs: NOW_MS,
    });

    expect(esClient.indices.existsAlias).toHaveBeenCalledWith(
      { name: WORKFLOWS_EXECUTIONS_INDEX },
      { signal: undefined }
    );
    expect(esClient.indices.existsAlias).toHaveBeenCalledWith(
      { name: WORKFLOWS_STEP_EXECUTIONS_INDEX },
      { signal: undefined }
    );
  });
});
