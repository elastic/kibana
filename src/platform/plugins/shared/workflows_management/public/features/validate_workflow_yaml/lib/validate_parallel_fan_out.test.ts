/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Scalar, YAMLSeq } from 'yaml';
import type { LineCounter } from 'yaml';
import { DEFAULT_PARALLEL_MAX_FAN_OUT } from '@kbn/workflows';
import { validateParallelFanOut } from './validate_parallel_fan_out';
import type { StepPropInfo } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { createStepInfo, createWorkflowLookup } from '../../../shared/test_utils';

const mockLineCounter: LineCounter = {
  linePos: (offset: number) => ({ line: offset + 1, col: 1 }),
  lineStarts: [],
  addNewLine(offset: number): number {
    return offset + 1;
  },
};

function createPropInfo(
  path: string[],
  value: unknown,
  valueRange: [number, number, number]
): StepPropInfo {
  const keyNode = new Scalar(path[path.length - 1]);
  keyNode.range = [0, 4, 4];

  const valueNode = new Scalar(value);
  valueNode.range = valueRange;

  return {
    path,
    keyNode,
    valueNode,
  };
}

function createArrayPropInfo(
  path: string[],
  values: unknown[],
  valueRange: [number, number, number]
): StepPropInfo {
  const keyNode = new Scalar(path[path.length - 1]);
  keyNode.range = [0, 4, 4];

  const valueNode = new YAMLSeq();
  values.forEach((v) => valueNode.add(new Scalar(v)));
  valueNode.range = valueRange;

  return {
    path,
    keyNode,
    valueNode: valueNode as unknown as StepPropInfo['valueNode'],
  };
}

describe('validateParallelFanOut', () => {
  it('warns when a parallel step has no concurrency limit', () => {
    const parallelStep = createStepInfo({
      stepId: 'fan_out',
      stepType: 'parallel',
      propInfos: {
        type: createPropInfo(['type'], 'parallel', [10, 20, 20]),
        foreach: createPropInfo(['foreach'], '{{ steps.list.output }}', [30, 50, 50]),
      },
    });

    const results = validateParallelFanOut(createWorkflowLookup([parallelStep]), mockLineCounter);

    expect(results).toEqual([
      expect.objectContaining({
        owner: 'parallel-fan-out-validation',
        severity: 'warning',
        hoverMessage: null,
        startLineNumber: 11,
        endLineNumber: 21,
      }),
    ]);
    expect(results[0].message).toMatch(/no "concurrency" limit/);
  });

  it('does not warn when a parallel step sets concurrency', () => {
    const parallelStep = createStepInfo({
      stepId: 'fan_out',
      stepType: 'parallel',
      propInfos: {
        type: createPropInfo(['type'], 'parallel', [10, 20, 20]),
        foreach: createPropInfo(['foreach'], '{{ steps.list.output }}', [30, 50, 50]),
        concurrency: createPropInfo(['concurrency'], 5, [60, 61, 61]),
      },
    });

    const results = validateParallelFanOut(createWorkflowLookup([parallelStep]), mockLineCounter);

    expect(results).toEqual([]);
  });

  it('does not warn when concurrency is set as an object (concurrency: { max })', () => {
    // `propInfos` is keyed by dotted leaf path, so the object form `concurrency:
    // { max: 3 }` only ever produces a `concurrency.max` entry — never a bare
    // `concurrency` key. This is the common authoring shape and used to trip a
    // false-positive "no concurrency limit" warning.
    const parallelStep = createStepInfo({
      stepId: 'fan_out',
      stepType: 'parallel',
      propInfos: {
        type: createPropInfo(['type'], 'parallel', [10, 20, 20]),
        foreach: createPropInfo(['foreach'], '{{ steps.list.output }}', [30, 50, 50]),
        'concurrency.max': createPropInfo(['concurrency', 'max'], 3, [60, 61, 61]),
      },
    });

    const results = validateParallelFanOut(createWorkflowLookup([parallelStep]), mockLineCounter);

    expect(results).toEqual([]);
  });

  it('warns when a literal foreach array exceeds the default fan-out ceiling', () => {
    const tooMany = Array.from({ length: DEFAULT_PARALLEL_MAX_FAN_OUT + 1 }, (_v, i) => i);
    const parallelStep = createStepInfo({
      stepId: 'fan_out',
      stepType: 'parallel',
      propInfos: {
        type: createPropInfo(['type'], 'parallel', [10, 20, 20]),
        'concurrency.max': createPropInfo(['concurrency', 'max'], 5, [60, 61, 61]),
        foreach: createArrayPropInfo(['foreach'], tooMany, [30, 50, 50]),
      },
    });

    const results = validateParallelFanOut(createWorkflowLookup([parallelStep]), mockLineCounter);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({
        owner: 'parallel-fan-out-validation',
        severity: 'warning',
      })
    );
    expect(results[0].message).toMatch(/exceeds the default maximum/);
  });

  it('does not warn when a literal foreach array is within the ceiling', () => {
    const okItems = Array.from({ length: 3 }, (_v, i) => i);
    const parallelStep = createStepInfo({
      stepId: 'fan_out',
      stepType: 'parallel',
      propInfos: {
        type: createPropInfo(['type'], 'parallel', [10, 20, 20]),
        'concurrency.max': createPropInfo(['concurrency', 'max'], 5, [60, 61, 61]),
        foreach: createArrayPropInfo(['foreach'], okItems, [30, 50, 50]),
      },
    });

    const results = validateParallelFanOut(createWorkflowLookup([parallelStep]), mockLineCounter);

    expect(results).toEqual([]);
  });

  it('does not size-check a dynamic foreach expression', () => {
    const parallelStep = createStepInfo({
      stepId: 'fan_out',
      stepType: 'parallel',
      propInfos: {
        type: createPropInfo(['type'], 'parallel', [10, 20, 20]),
        'concurrency.max': createPropInfo(['concurrency', 'max'], 5, [60, 61, 61]),
        foreach: createPropInfo(['foreach'], '{{ steps.list.output }}', [30, 50, 50]),
      },
    });

    const results = validateParallelFanOut(createWorkflowLookup([parallelStep]), mockLineCounter);

    expect(results).toEqual([]);
  });

  it('does not warn for a static branches parallel step (no concurrency needed)', () => {
    const staticStep = createStepInfo({
      stepId: 'enrich',
      stepType: 'parallel',
      propInfos: {
        type: createPropInfo(['type'], 'parallel', [10, 20, 20]),
        'branches.0.name': createPropInfo(['branches', '0', 'name'], 'a', [30, 31, 31]),
        'branches.1.name': createPropInfo(['branches', '1', 'name'], 'b', [40, 41, 41]),
      },
    });

    const results = validateParallelFanOut(createWorkflowLookup([staticStep]), mockLineCounter);

    expect(results).toEqual([]);
  });

  it('ignores non-parallel steps', () => {
    const foreachStep = createStepInfo({
      stepId: 'loop',
      stepType: 'foreach',
      propInfos: {
        type: createPropInfo(['type'], 'foreach', [10, 20, 20]),
      },
    });

    const results = validateParallelFanOut(createWorkflowLookup([foreachStep]), mockLineCounter);

    expect(results).toEqual([]);
  });
});
