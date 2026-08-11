/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isLineInTriggers } from './trigger_finder';
import {
  createStepInfo,
  createWorkflowLookup,
} from '../../../../../shared/test_utils/step_info_factory';

describe('isLineInTriggers', () => {
  const step = createStepInfo({ stepId: 'step-1', lineStart: 10, lineEnd: 20 });
  const lookup = createWorkflowLookup([step], { triggersLineStart: 3 });

  it('returns true for a line inside the triggers block', () => {
    expect(isLineInTriggers(3, lookup)).toBe(true);
    expect(isLineInTriggers(5, lookup)).toBe(true);
    expect(isLineInTriggers(9, lookup)).toBe(true); // one before first step
  });

  it('returns false for a line on the first step (boundary)', () => {
    expect(isLineInTriggers(10, lookup)).toBe(false);
  });

  it('returns false for a line inside a step', () => {
    expect(isLineInTriggers(15, lookup)).toBe(false);
  });

  it('returns false when triggersLineStart is undefined', () => {
    const lookupNoTrigger = createWorkflowLookup([step]);
    expect(isLineInTriggers(5, lookupNoTrigger)).toBe(false);
  });

  it('returns true for any line >= triggersLineStart when there are no steps (open-ended)', () => {
    const lookupNoSteps = createWorkflowLookup([], { triggersLineStart: 3 });
    expect(isLineInTriggers(3, lookupNoSteps)).toBe(true);
    expect(isLineInTriggers(999, lookupNoSteps)).toBe(true);
  });

  it('returns false for a line before triggersLineStart', () => {
    expect(isLineInTriggers(2, lookup)).toBe(false);
    expect(isLineInTriggers(1, lookup)).toBe(false);
  });
});
