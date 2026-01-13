/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowInput } from '@kbn/workflows';
import { validateWorkflowInputs } from './validate_workflow_inputs';

describe('validateWorkflowInputs', () => {
  describe('when target workflow has no inputs', () => {
    it('should return valid for any inputs or no inputs', () => {
      expect(validateWorkflowInputs({}, undefined).isValid).toBe(true);
      expect(validateWorkflowInputs(undefined, undefined).isValid).toBe(true);
      expect(validateWorkflowInputs({ extra: 'value' }, []).isValid).toBe(true);
    });
  });

  describe('when inputs are missing', () => {
    it('should return error for missing required input', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
      ];

      const result = validateWorkflowInputs(undefined, targetInputs);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].inputName).toBe('');
      expect(result.errors[0].message).toContain('Missing required inputs');
      expect(result.errors[0].message).toContain('name');
    });

    it('should return valid when no required inputs', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: false,
        },
      ];

      const result = validateWorkflowInputs(undefined, targetInputs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for multiple missing required inputs', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
        {
          name: 'age',
          type: 'number',
          required: true,
        },
        {
          name: 'optional',
          type: 'string',
          required: false,
        },
      ];

      const result = validateWorkflowInputs(undefined, targetInputs);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('name');
      expect(result.errors[0].message).toContain('age');
    });
  });

  describe('string input validation', () => {
    it('should validate string input and return error for wrong type', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
      ];

      expect(validateWorkflowInputs({ name: 'test' }, targetInputs).isValid).toBe(true);
      const errorResult = validateWorkflowInputs({ name: 123 }, targetInputs);
      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors[0].inputName).toBe('name');
      expect(errorResult.errors[0].message).toContain('string');
    });

    it('should allow optional string input to be missing', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: false,
        },
      ];

      expect(validateWorkflowInputs({}, targetInputs).isValid).toBe(true);
    });
  });

  describe('number input validation', () => {
    it('should validate number input and return error for wrong type', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'count',
          type: 'number',
          required: true,
        },
      ];

      expect(validateWorkflowInputs({ count: 42 }, targetInputs).isValid).toBe(true);
      const errorResult = validateWorkflowInputs({ count: '42' }, targetInputs);
      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors[0].inputName).toBe('count');
      expect(errorResult.errors[0].message).toContain('number');
    });
  });

  describe('boolean input validation', () => {
    it('should validate boolean input and return error for wrong type', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'enabled',
          type: 'boolean',
          required: true,
        },
      ];

      expect(validateWorkflowInputs({ enabled: true }, targetInputs).isValid).toBe(true);
      const errorResult = validateWorkflowInputs({ enabled: 'true' }, targetInputs);
      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors[0].inputName).toBe('enabled');
      expect(errorResult.errors[0].message).toContain('boolean');
    });
  });

  describe('choice input validation', () => {
    it('should validate choice input correctly', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'status',
          type: 'choice',
          required: true,
          options: ['active', 'inactive', 'pending'],
        },
      ];

      const result = validateWorkflowInputs({ status: 'active' }, targetInputs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid choice value', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'status',
          type: 'choice',
          required: true,
          options: ['active', 'inactive', 'pending'],
        },
      ];

      const result = validateWorkflowInputs({ status: 'invalid' }, targetInputs);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].inputName).toBe('status');
    });
  });

  describe('array input validation', () => {
    it('should validate array inputs (string, number, boolean) and return error for wrong type', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'people',
          type: 'array',
          required: true,
        },
      ];

      expect(validateWorkflowInputs({ people: ['alice', 'bob'] }, targetInputs).isValid).toBe(true);
      expect(validateWorkflowInputs({ people: [1, 2, 3] }, targetInputs).isValid).toBe(true);
      expect(validateWorkflowInputs({ people: [true, false] }, targetInputs).isValid).toBe(true);

      const errorResult = validateWorkflowInputs({ people: 'charlie' }, targetInputs);
      expect(errorResult.isValid).toBe(false);
      expect(errorResult.errors[0].inputName).toBe('people');
      expect(errorResult.errors[0].message).toBe('expected array, received string');
    });

    it('should validate array constraints (minItems, maxItems)', () => {
      expect(
        validateWorkflowInputs({ items: ['one'] }, [
          { name: 'items', type: 'array', required: true, minItems: 2 },
        ]).isValid
      ).toBe(false);
      expect(
        validateWorkflowInputs({ items: ['one', 'two', 'three'] }, [
          { name: 'items', type: 'array', required: true, maxItems: 2 },
        ]).isValid
      ).toBe(false);
    });
  });

  describe('multiple inputs validation', () => {
    it('should validate multiple inputs correctly', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
        {
          name: 'count',
          type: 'number',
          required: false,
        },
        {
          name: 'enabled',
          type: 'boolean',
          required: true,
        },
      ];

      const result = validateWorkflowInputs(
        { name: 'test', count: 42, enabled: true },
        targetInputs
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return multiple errors for multiple invalid inputs', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
        {
          name: 'count',
          type: 'number',
          required: true,
        },
      ];

      const result = validateWorkflowInputs({ name: 123, count: '42' }, targetInputs);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].inputName).toBe('name');
      expect(result.errors[1].inputName).toBe('count');
    });
  });

  describe('error message formatting', () => {
    it('should remove "Invalid input:" prefix from error messages', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
      ];

      const result = validateWorkflowInputs({ name: 123 }, targetInputs);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).not.toContain('Invalid input:');
    });

    it('should provide clear error message for array union errors', () => {
      const targetInputs: WorkflowInput[] = [
        {
          name: 'people',
          type: 'array',
          required: true,
        },
      ];

      const result = validateWorkflowInputs({ people: 'charlie' }, targetInputs);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('expected array, received string');
    });
  });
});
