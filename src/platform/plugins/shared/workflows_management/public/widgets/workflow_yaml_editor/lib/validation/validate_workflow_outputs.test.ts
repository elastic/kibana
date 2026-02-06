/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowOutput } from '@kbn/workflows';
import { validateWorkflowOutputs } from './validate_workflow_outputs';

describe('validateWorkflowOutputs', () => {
  describe('when target workflow has no outputs', () => {
    it('should return valid for any outputs or no outputs', () => {
      expect(validateWorkflowOutputs({}, undefined).isValid).toBe(true);
      expect(validateWorkflowOutputs(undefined, undefined).isValid).toBe(true);
      expect(validateWorkflowOutputs({ extra: 'value' }, []).isValid).toBe(true);
    });
  });

  describe('when outputs are missing', () => {
    it('should return error for missing required output', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'result',
          type: 'string',
          required: true,
        },
      ];

      const result = validateWorkflowOutputs(undefined, targetOutputs);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].outputName).toBe('');
      expect(result.errors[0].message).toContain('Missing required outputs');
      expect(result.errors[0].message).toContain('result');
    });

    it('should return valid when no required outputs', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'result',
          type: 'string',
          required: false,
        },
      ];

      const result = validateWorkflowOutputs(undefined, targetOutputs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for multiple missing required outputs', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'result',
          type: 'string',
          required: true,
        },
        {
          name: 'count',
          type: 'number',
          required: true,
        },
        {
          name: 'optional',
          type: 'string',
          required: false,
        },
      ];

      const result = validateWorkflowOutputs(undefined, targetOutputs);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('result');
      expect(result.errors[0].message).toContain('count');
    });
  });

  describe('string output validation', () => {
    it('should validate string output and return error for wrong type', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'result',
          type: 'string',
          required: true,
        },
      ];

      expect(validateWorkflowOutputs({ result: 'test' }, targetOutputs).isValid).toBe(true);
      const errorResult = validateWorkflowOutputs({ result: 123 }, targetOutputs);
      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors[0].outputName).toBe('result');
      expect(errorResult.errors[0].message).toContain('string');
    });

    it('should allow optional string output to be missing', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'result',
          type: 'string',
          required: false,
        },
      ];

      expect(validateWorkflowOutputs({}, targetOutputs).isValid).toBe(true);
    });
  });

  describe('number output validation', () => {
    it('should validate number output and return error for wrong type', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'count',
          type: 'number',
          required: true,
        },
      ];

      expect(validateWorkflowOutputs({ count: 42 }, targetOutputs).isValid).toBe(true);
      const errorResult = validateWorkflowOutputs({ count: '42' }, targetOutputs);
      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors[0].outputName).toBe('count');
      expect(errorResult.errors[0].message).toContain('number');
    });
  });

  describe('boolean output validation', () => {
    it('should validate boolean output and return error for wrong type', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'success',
          type: 'boolean',
          required: true,
        },
      ];

      expect(validateWorkflowOutputs({ success: true }, targetOutputs).isValid).toBe(true);
      const errorResult = validateWorkflowOutputs({ success: 'true' }, targetOutputs);
      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors[0].outputName).toBe('success');
      expect(errorResult.errors[0].message).toContain('boolean');
    });
  });

  describe('choice output validation', () => {
    it('should validate choice output correctly', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'status',
          type: 'choice',
          required: true,
          options: ['success', 'failure', 'pending'],
        },
      ];

      expect(validateWorkflowOutputs({ status: 'success' }, targetOutputs).isValid).toBe(true);
      expect(validateWorkflowOutputs({ status: 'failure' }, targetOutputs).isValid).toBe(true);

      const errorResult = validateWorkflowOutputs({ status: 'invalid' }, targetOutputs);
      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors[0].outputName).toBe('status');
    });

    it('should allow optional choice output to be missing', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'status',
          type: 'choice',
          required: false,
          options: ['success', 'failure'],
        },
      ];

      expect(validateWorkflowOutputs({}, targetOutputs).isValid).toBe(true);
    });
  });

  describe('array output validation', () => {
    it('should validate array of strings', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'items',
          type: 'array',
          required: true,
        },
      ];

      expect(validateWorkflowOutputs({ items: ['a', 'b', 'c'] }, targetOutputs).isValid).toBe(true);
      expect(validateWorkflowOutputs({ items: [1, 2, 3] }, targetOutputs).isValid).toBe(true);
      expect(validateWorkflowOutputs({ items: [true, false] }, targetOutputs).isValid).toBe(true);
    });

    it('should return error for non-array value when array expected', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'items',
          type: 'array',
          required: true,
        },
      ];

      const errorResult = validateWorkflowOutputs({ items: 'not an array' }, targetOutputs);
      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors[0].outputName).toBe('items');
      expect(errorResult.errors[0].message).toContain('array');
      expect(errorResult.errors[0].message).toContain('string');
    });

    it('should validate minItems constraint', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'items',
          type: 'array',
          required: true,
          minItems: 2,
        },
      ];

      expect(validateWorkflowOutputs({ items: ['a', 'b'] }, targetOutputs).isValid).toBe(true);
      expect(validateWorkflowOutputs({ items: ['a', 'b', 'c'] }, targetOutputs).isValid).toBe(true);

      const errorResult = validateWorkflowOutputs({ items: ['a'] }, targetOutputs);
      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors[0].outputName).toBe('items');
    });

    it('should validate maxItems constraint', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'items',
          type: 'array',
          required: true,
          maxItems: 2,
        },
      ];

      expect(validateWorkflowOutputs({ items: ['a'] }, targetOutputs).isValid).toBe(true);
      expect(validateWorkflowOutputs({ items: ['a', 'b'] }, targetOutputs).isValid).toBe(true);

      const errorResult = validateWorkflowOutputs({ items: ['a', 'b', 'c'] }, targetOutputs);
      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors[0].outputName).toBe('items');
    });

    it('should validate both minItems and maxItems constraints', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'items',
          type: 'array',
          required: true,
          minItems: 2,
          maxItems: 3,
        },
      ];

      expect(validateWorkflowOutputs({ items: ['a', 'b'] }, targetOutputs).isValid).toBe(true);
      expect(validateWorkflowOutputs({ items: ['a', 'b', 'c'] }, targetOutputs).isValid).toBe(true);

      const tooFewResult = validateWorkflowOutputs({ items: ['a'] }, targetOutputs);
      expect(tooFewResult.isValid).toBe(false);

      const tooManyResult = validateWorkflowOutputs({ items: ['a', 'b', 'c', 'd'] }, targetOutputs);
      expect(tooManyResult.isValid).toBe(false);
    });

    it('should allow optional array output to be missing', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'items',
          type: 'array',
          required: false,
        },
      ];

      expect(validateWorkflowOutputs({}, targetOutputs).isValid).toBe(true);
    });
  });

  describe('multiple outputs validation', () => {
    it('should validate all outputs correctly', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'result',
          type: 'string',
          required: true,
        },
        {
          name: 'count',
          type: 'number',
          required: true,
        },
        {
          name: 'success',
          type: 'boolean',
          required: false,
        },
      ];

      expect(
        validateWorkflowOutputs(
          {
            result: 'done',
            count: 42,
            success: true,
          },
          targetOutputs
        ).isValid
      ).toBe(true);

      expect(
        validateWorkflowOutputs(
          {
            result: 'done',
            count: 42,
          },
          targetOutputs
        ).isValid
      ).toBe(true);
    });

    it('should return errors for all invalid outputs', () => {
      const targetOutputs: WorkflowOutput[] = [
        {
          name: 'result',
          type: 'string',
          required: true,
        },
        {
          name: 'count',
          type: 'number',
          required: true,
        },
      ];

      const errorResult = validateWorkflowOutputs(
        {
          result: 123,
          count: 'not a number',
        },
        targetOutputs
      );

      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors).toHaveLength(2);
      expect(errorResult.errors.some((e) => e.outputName === 'result')).toBe(true);
      expect(errorResult.errors.some((e) => e.outputName === 'count')).toBe(true);
    });
  });
});
