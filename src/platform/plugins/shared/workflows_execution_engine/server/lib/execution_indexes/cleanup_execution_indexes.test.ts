/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  cleanupExecutionIndexIfEligible,
  cleanupWorkflowExecutionIndexes,
} from './cleanup_execution_indexes';
import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../../common';

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

  it('skips the write index and stops when the oldest non-write index is younger than minIndexAge', async () => {
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
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(
        'Stopping cleanup for alias .workflows-executions: .workflows-executions-000002'
      )
    );
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

  it('deletes every eligible non-write index in one pass and stops at the first too-young index', async () => {
    const esClient = createEsClientMock();
    esClient.indices.existsAlias.mockResolvedValue(true);
    esClient.indices.getAlias.mockResolvedValue({
      '.workflows-executions-000001': {
        aliases: { [WORKFLOWS_EXECUTIONS_INDEX]: {} },
      },
      '.workflows-executions-000002': {
        aliases: { [WORKFLOWS_EXECUTIONS_INDEX]: {} },
      },
      '.workflows-executions-000003': {
        aliases: { [WORKFLOWS_EXECUTIONS_INDEX]: {} },
      },
      '.workflows-executions-000004': {
        aliases: { [WORKFLOWS_EXECUTIONS_INDEX]: { is_write_index: true } },
      },
    });
    esClient.indices.getSettings.mockImplementation(async ({ index }) => ({
      [index]: {
        settings: {
          index: {
            creation_date:
              index === '.workflows-executions-000003'
                ? String(NOW_MS - 60_000)
                : String(OLD_CREATION_MS),
          },
        },
      },
    }));
    esClient.indices.delete.mockResolvedValue({ acknowledged: true });
    const logger = createLoggerMock();

    const deletedCount = await cleanupExecutionIndexIfEligible({
      esClient: esClient as any,
      aliasName: WORKFLOWS_EXECUTIONS_INDEX,
      options: OPTIONS,
      logger: logger as any,
      nowMs: NOW_MS,
    });

    expect(deletedCount).toBe(2);
    expect(esClient.indices.delete).toHaveBeenCalledTimes(2);
    expect(esClient.indices.delete).toHaveBeenCalledWith(
      { index: '.workflows-executions-000001' },
      { signal: undefined }
    );
    expect(esClient.indices.delete).toHaveBeenCalledWith(
      { index: '.workflows-executions-000002' },
      { signal: undefined }
    );
    expect(esClient.indices.getSettings).toHaveBeenCalledTimes(3);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(
        'Stopping cleanup for alias .workflows-executions: .workflows-executions-000003'
      )
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
