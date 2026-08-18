/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Scalar } from 'yaml';
import type { LineCounter } from 'yaml';
import { validateGraphBuild } from './validate_graph_build';
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

  return { path, keyNode, valueNode };
}

describe('validateGraphBuild', () => {
  it('returns no results when there is no graph-build error', () => {
    const results = validateGraphBuild(undefined, createWorkflowLookup([]), mockLineCounter);
    expect(results).toEqual([]);
  });

  it('anchors the error to the offending step type line when stepId is known', () => {
    const parallelStep = createStepInfo({
      stepId: 'fan_out',
      stepType: 'parallel',
      lineStart: 5,
      propInfos: {
        type: createPropInfo(['type'], 'parallel', [10, 20, 20]),
      },
    });

    const results = validateGraphBuild(
      {
        message: 'Parallel step "fan_out" ... not supported inside a parallel branch yet.',
        stepId: 'fan_out',
      },
      createWorkflowLookup([parallelStep]),
      mockLineCounter
    );

    expect(results).toEqual([
      expect.objectContaining({
        owner: 'graph-build-validation',
        severity: 'error',
        startLineNumber: 11,
        endLineNumber: 21,
      }),
    ]);
    expect(results[0].message).toMatch(/not supported inside a parallel branch/);
  });

  it('falls back to the step first line when no type prop range is available', () => {
    const parallelStep = createStepInfo({
      stepId: 'fan_out',
      stepType: 'parallel',
      lineStart: 7,
      propInfos: {},
    });

    const results = validateGraphBuild(
      { message: 'boom', stepId: 'fan_out' },
      createWorkflowLookup([parallelStep]),
      mockLineCounter
    );

    expect(results[0]).toEqual(
      expect.objectContaining({
        owner: 'graph-build-validation',
        severity: 'error',
        startLineNumber: 7,
        endLineNumber: 7,
      })
    );
  });

  it('falls back to the top of the document when stepId is unknown', () => {
    const results = validateGraphBuild(
      { message: 'something failed to compile' },
      createWorkflowLookup([]),
      mockLineCounter
    );

    expect(results[0]).toEqual(
      expect.objectContaining({
        owner: 'graph-build-validation',
        severity: 'error',
        startLineNumber: 1,
        startColumn: 1,
        message: 'something failed to compile',
      })
    );
  });
});
