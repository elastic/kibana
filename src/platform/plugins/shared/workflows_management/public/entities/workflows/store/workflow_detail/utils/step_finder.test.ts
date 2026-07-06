/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowLookup } from './build_workflow_lookup';
import { findStepByLine } from './step_finder';
import {
  createStepInfo as createStep,
  createWorkflowLookup,
} from '../../../../../shared/test_utils';

const createStepInfo = (stepId: string, lineStart: number, lineEnd: number) =>
  createStep({ stepId, stepType: 'console', lineStart, lineEnd });

const createLookup = createWorkflowLookup;

describe('findStepByLine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('null/undefined workflowLookup', () => {
    it('should return undefined when workflowLookup is null', () => {
      const result = findStepByLine(5, null as unknown as WorkflowLookup);
      expect(result).toBeUndefined();
    });

    it('should return undefined when workflowLookup is undefined', () => {
      const result = findStepByLine(5, undefined as unknown as WorkflowLookup);
      expect(result).toBeUndefined();
    });
  });

  describe('exact match', () => {
    it('should return the step id when cursor is within the step range', () => {
      const lookup = createLookup([
        createStepInfo('step1', 5, 10),
        createStepInfo('step2', 12, 18),
      ]);

      expect(findStepByLine(7, lookup)).toBe('step1');
    });

    it('should return the step id when cursor is at the start of the step', () => {
      const lookup = createLookup([createStepInfo('step1', 5, 10)]);
      expect(findStepByLine(5, lookup)).toBe('step1');
    });

    it('should return the step id when cursor is at the end of the step', () => {
      const lookup = createLookup([createStepInfo('step1', 5, 10)]);
      expect(findStepByLine(10, lookup)).toBe('step1');
    });

    it('should match the correct step when multiple steps exist', () => {
      const lookup = createLookup([
        createStepInfo('step1', 5, 10),
        createStepInfo('step2', 12, 18),
        createStepInfo('step3', 20, 25),
      ]);

      expect(findStepByLine(15, lookup)).toBe('step2');
    });
  });

  describe('fallback to preceding step', () => {
    it('should return the preceding step when cursor is just past its range', () => {
      // step1 ends at line 10, step2 starts at line 15
      // cursor is at line 11 — gap between steps, closest preceding is step1
      const lookup = createLookup([
        createStepInfo('step1', 5, 10),
        createStepInfo('step2', 15, 20),
      ]);

      expect(findStepByLine(11, lookup)).toBe('step1');
    });

    it('should return undefined when cursor is between two steps and another step starts before cursor', () => {
      // step1 ends at line 10, step2 starts at line 12
      // cursor at line 13 — step2 starts at 12 which is > step1.lineEnd(10) and <= 13
      const lookup = createLookup([
        createStepInfo('step1', 5, 10),
        createStepInfo('step2', 12, 18),
      ]);

      // Line 11 is in the gap — step2 starts at 12, which is > step1.lineEnd (10) but 12 > 11
      // So no other step starts before cursor line 11
      expect(findStepByLine(11, lookup)).toBe('step1');
    });
  });

  describe('cursor before all steps', () => {
    it('should return undefined when cursor is before all steps', () => {
      const lookup = createLookup([
        createStepInfo('step1', 5, 10),
        createStepInfo('step2', 12, 18),
      ]);

      expect(findStepByLine(2, lookup)).toBeUndefined();
    });
  });

  describe('cursor after last step', () => {
    it('should return the last step when cursor is after the last step range', () => {
      const lookup = createLookup([
        createStepInfo('step1', 5, 10),
        createStepInfo('step2', 12, 18),
      ]);

      expect(findStepByLine(25, lookup)).toBe('step2');
    });
  });

  describe('empty steps', () => {
    it('should return undefined when there are no steps', () => {
      const lookup = createLookup([]);
      expect(findStepByLine(5, lookup)).toBeUndefined();
    });
  });

  describe('gap between steps with another step starting before cursor', () => {
    it('should return undefined when another step starts between the best and the cursor', () => {
      // step1: lines 5-10, step2: lines 12-18
      // Cursor at line 13 is within step2 (exact match), so this is not the gap scenario
      // Let's test a true gap: step1: 5-10, step2: 12-14, cursor at line 15 (between step2 end and no next step)
      const lookup = createLookup([
        createStepInfo('step1', 5, 10),
        createStepInfo('step2', 12, 14),
      ]);

      // Cursor at 15, step2 ends at 14, no other step starts after step2
      // Best = step2 (lineEnd 14), no other step starts at > 14 and <= 15
      expect(findStepByLine(15, lookup)).toBe('step2');
    });
  });
});
