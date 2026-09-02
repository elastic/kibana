/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { loadExecutionStepPages } from './load_execution_step_pages';

const step = (
  id: string,
  status: ExecutionStatus = ExecutionStatus.COMPLETED
): WorkflowStepExecutionDto =>
  ({
    id,
    stepId: id,
    status,
    globalExecutionIndex: 0,
  } as WorkflowStepExecutionDto);

describe('loadExecutionStepPages', () => {
  it('fetches one page of maxSteps when the cache is empty', async () => {
    const fetchPage = jest.fn().mockResolvedValue({
      results: [step('a'), step('b')],
      total: 2,
      page: 1,
      size: 6,
    });

    const result = await loadExecutionStepPages({
      fetchPage,
      cachedSteps: [],
      pollPageSize: 2,
      maxSteps: 6,
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(1, 6);
    expect(result.steps.map((s) => s.id)).toEqual(['a', 'b']);
    expect(result.total).toBe(2);
  });

  it('skips a full terminal batch and fetches the next page', async () => {
    const fetchPage = jest.fn().mockImplementation(async (page: number) => {
      if (page === 2) {
        return {
          results: [step('c', ExecutionStatus.RUNNING), step('d')],
          total: 4,
          page: 2,
          size: 2,
        };
      }
      throw new Error(`unexpected page ${page}`);
    });

    const result = await loadExecutionStepPages({
      fetchPage,
      cachedSteps: [step('a'), step('b')],
      cachedTotal: 2,
      pollPageSize: 2,
      maxSteps: 6,
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(2, 2);
    expect(result.steps.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.total).toBe(4);
  });

  it('does not skip a short terminal batch so new steps on that page are picked up', async () => {
    const fetchPage = jest.fn().mockResolvedValue({
      results: [step('a'), step('b', ExecutionStatus.RUNNING)],
      total: 2,
      page: 1,
      size: 2,
    });

    const result = await loadExecutionStepPages({
      fetchPage,
      cachedSteps: [step('a')],
      cachedTotal: 1,
      pollPageSize: 2,
      maxSteps: 6,
    });

    expect(fetchPage).toHaveBeenCalledWith(1, 2);
    expect(result.steps.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('stops after maxSteps even when total is larger', async () => {
    const fetchPage = jest.fn().mockImplementation(async (page: number) => ({
      results: [
        step(`${page}-1`, ExecutionStatus.RUNNING),
        step(`${page}-2`, ExecutionStatus.RUNNING),
      ],
      total: 10,
      page,
      size: 2,
    }));

    const result = await loadExecutionStepPages({
      fetchPage,
      cachedSteps: [step('old-1', ExecutionStatus.RUNNING), step('old-2', ExecutionStatus.RUNNING)],
      cachedTotal: 2,
      pollPageSize: 2,
      maxSteps: 4,
    });

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, 2);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 2);
    expect(result.steps).toHaveLength(4);
    expect(result.total).toBe(10);
  });

  it('does not fetch when every in-window batch is already terminal', async () => {
    const fetchPage = jest.fn();

    const result = await loadExecutionStepPages({
      fetchPage,
      cachedSteps: [step('a'), step('b'), step('c'), step('d')],
      cachedTotal: 4,
      pollPageSize: 2,
      maxSteps: 4,
    });

    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.steps.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.total).toBe(4);
  });
});
