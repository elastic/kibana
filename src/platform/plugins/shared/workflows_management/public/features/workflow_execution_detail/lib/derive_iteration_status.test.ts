/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  applyTrailingNotRunConstraint,
  buildIterationStatusOverrides,
  deriveIterationStatus,
  worstStatus,
} from './derive_iteration_status';

const mapWith = (
  entries: Array<{ id: string; status: ExecutionStatus }>
): Map<string, WorkflowStepExecutionDto> => {
  const map = new Map<string, WorkflowStepExecutionDto>();
  for (const entry of entries) {
    map.set(entry.id, {
      id: entry.id,
      status: entry.status,
    } as WorkflowStepExecutionDto);
  }
  return map;
};

describe('deriveIterationStatus', () => {
  it('returns SKIPPED when there are no executed descendant steps', () => {
    const status = deriveIterationStatus(
      {
        stepId: '0',
        stepType: 'foreach-iteration',
        status: null,
        stepExecutionId: null,
        children: [],
      },
      new Map()
    );
    expect(status).toBe(ExecutionStatus.SKIPPED);
  });

  it('derives COMPLETED from executed children even when the synthetic node was SKIPPED', () => {
    const status = deriveIterationStatus(
      {
        stepId: '0',
        stepType: 'foreach-iteration',
        status: ExecutionStatus.SKIPPED,
        stepExecutionId: null,
        children: [
          {
            stepId: 'log',
            stepType: 'console',
            status: ExecutionStatus.COMPLETED,
            stepExecutionId: 'step-0',
            children: [],
          },
        ],
      },
      mapWith([{ id: 'step-0', status: ExecutionStatus.COMPLETED }])
    );
    expect(status).toBe(ExecutionStatus.COMPLETED);
  });

  it('picks the worst descendant status', () => {
    const status = deriveIterationStatus(
      {
        stepId: '1',
        stepType: 'foreach-iteration',
        status: null,
        stepExecutionId: null,
        children: [
          {
            stepId: 'a',
            stepType: 'console',
            status: ExecutionStatus.COMPLETED,
            stepExecutionId: 'a',
            children: [],
          },
          {
            stepId: 'b',
            stepType: 'console',
            status: ExecutionStatus.FAILED,
            stepExecutionId: 'b',
            children: [],
          },
        ],
      },
      mapWith([
        { id: 'a', status: ExecutionStatus.COMPLETED },
        { id: 'b', status: ExecutionStatus.FAILED },
      ])
    );
    expect(status).toBe(ExecutionStatus.FAILED);
  });
});

describe('applyTrailingNotRunConstraint', () => {
  it('keeps a trailing not-run block and coerces earlier holes', () => {
    expect(
      applyTrailingNotRunConstraint([
        ExecutionStatus.COMPLETED,
        ExecutionStatus.SKIPPED,
        ExecutionStatus.COMPLETED,
        ExecutionStatus.SKIPPED,
        ExecutionStatus.SKIPPED,
      ])
    ).toEqual([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.COMPLETED,
      ExecutionStatus.COMPLETED,
      ExecutionStatus.SKIPPED,
      ExecutionStatus.SKIPPED,
    ]);
  });
});

describe('buildIterationStatusOverrides', () => {
  it('marks completed foreach iterations as completed, not skipped', () => {
    const overrides = buildIterationStatusOverrides(
      [
        {
          stepId: '0',
          stepType: 'foreach-iteration',
          status: ExecutionStatus.SKIPPED,
          stepExecutionId: null,
          children: [
            {
              stepId: 'log',
              stepType: 'console',
              status: ExecutionStatus.COMPLETED,
              stepExecutionId: 's0',
              children: [],
            },
          ],
        },
        {
          stepId: '1',
          stepType: 'foreach-iteration',
          status: ExecutionStatus.SKIPPED,
          stepExecutionId: null,
          children: [
            {
              stepId: 'log',
              stepType: 'console',
              status: ExecutionStatus.COMPLETED,
              stepExecutionId: 's1',
              children: [],
            },
          ],
        },
      ],
      mapWith([
        { id: 's0', status: ExecutionStatus.COMPLETED },
        { id: 's1', status: ExecutionStatus.COMPLETED },
      ])
    );

    expect(overrides.get(0)).toBe(ExecutionStatus.COMPLETED);
    expect(overrides.get(1)).toBe(ExecutionStatus.COMPLETED);
  });
});

describe('worstStatus', () => {
  it('returns SKIPPED for an empty list', () => {
    expect(worstStatus([])).toBe(ExecutionStatus.SKIPPED);
  });
});
