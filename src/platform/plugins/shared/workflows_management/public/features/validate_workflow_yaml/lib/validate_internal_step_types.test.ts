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
import { validateInternalStepTypes } from './validate_internal_step_types';
import { getStepUsageRestriction } from '../../../../common/schema';
import type { StepPropInfo } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { createStepInfo, createWorkflowLookup } from '../../../shared/test_utils/step_info_factory';

jest.mock('../../../../common/schema', () => ({
  getStepUsageRestriction: jest.fn(),
}));

const mockLineCounter: LineCounter = {
  linePos: (offset: number) => ({ line: offset + 1, col: 1 }),
  lineStarts: [],
  addNewLine(offset: number): number {
    return offset + 1;
  },
};

const createTypePropInfo = (stepType: string): StepPropInfo => {
  const keyNode = new Scalar('type');
  keyNode.range = [0, 4, 4];

  const valueNode = new Scalar(stepType);
  valueNode.range = [10, 20, 20];

  return { path: ['type'], keyNode, valueNode };
};

const createStep = (stepType: string) =>
  createStepInfo({
    stepId: stepType,
    stepType,
    propInfos: { type: createTypePropInfo(stepType) },
  });

describe('validateInternalStepTypes', () => {
  const lookup = createWorkflowLookup([
    createStep('custom.public'),
    createStep('custom.internal'),
    createStep('custom.managedOnly'),
  ]);

  beforeEach(() => {
    jest.mocked(getStepUsageRestriction).mockImplementation((stepType: string) => {
      if (stepType === 'custom.internal') {
        return 'internal';
      }
      if (stepType === 'custom.managedOnly') {
        return 'managedOnly';
      }
      return undefined;
    });
  });

  it('warns about internal steps and errors on managed-only steps in workflows that are not managed', () => {
    const results = validateInternalStepTypes(lookup, mockLineCounter, false);

    expect(results).toEqual([
      expect.objectContaining({
        owner: 'internal-step-validation',
        ruleId: 'internalStepType',
        severity: 'warning',
        hoverMessage: null,
        message:
          'Step type "custom.internal" is an internal step. Use it at your own risk: its inputs, outputs and behavior can change without notice.',
        startLineNumber: 11,
        endLineNumber: 21,
      }),
      expect.objectContaining({
        owner: 'internal-step-validation',
        ruleId: 'managedOnlyStepType',
        severity: 'error',
        hoverMessage: null,
        message:
          'Step type "custom.managedOnly" is an internal step and can\'t be used in custom workflows.',
        startLineNumber: 11,
        endLineNumber: 21,
      }),
    ]);
  });

  it('accepts internal and managed-only steps in managed workflows', () => {
    expect(validateInternalStepTypes(lookup, mockLineCounter, true)).toEqual([]);
  });

  it('skips steps without a type value range', () => {
    const stepWithoutRange = createStepInfo({
      stepId: 'no_range',
      stepType: 'custom.managedOnly',
      propInfos: {},
    });

    expect(
      validateInternalStepTypes(createWorkflowLookup([stepWithoutRange]), mockLineCounter, false)
    ).toEqual([]);
  });
});
