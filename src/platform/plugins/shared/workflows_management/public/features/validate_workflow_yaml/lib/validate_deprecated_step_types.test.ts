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
import { validateDeprecatedStepTypes } from './validate_deprecated_step_types';
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

describe('validateDeprecatedStepTypes', () => {
  it('returns a warning for deprecated step types with replacements', () => {
    const deprecatedStep = createStepInfo({
      stepId: 'create_case',
      stepType: 'kibana.createCase',
      propInfos: {
        type: createPropInfo(['type'], 'kibana.createCase', [10, 20, 20]),
      },
    });

    const results = validateDeprecatedStepTypes(
      createWorkflowLookup([deprecatedStep]),
      mockLineCounter
    );

    expect(results).toEqual([
      expect.objectContaining({
        owner: 'deprecated-step-validation',
        severity: 'warning',
        hoverMessage: null,
        message: 'Step type "kibana.createCase" is deprecated. Use "cases.createCase" instead.',
        startLineNumber: 11,
        endLineNumber: 21,
      }),
    ]);
  });

  it('returns no warnings for non-deprecated step types', () => {
    const currentStep = createStepInfo({
      stepId: 'create_case',
      stepType: 'cases.createCase',
      propInfos: {
        type: createPropInfo(['type'], 'cases.createCase', [10, 20, 20]),
      },
    });

    const results = validateDeprecatedStepTypes(
      createWorkflowLookup([currentStep]),
      mockLineCounter
    );

    expect(results).toEqual([]);
  });
});
