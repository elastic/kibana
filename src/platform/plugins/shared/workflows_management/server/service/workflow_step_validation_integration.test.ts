/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowValidationError } from '../../common/lib/errors';
import { validateStepNameUniqueness } from '../../common/lib/validate_step_names';

describe('Workflow Step Validation Integration', () => {
  it('should throw WorkflowValidationError for workflows with duplicate step names', () => {
    const workflowWithDuplicates: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        { name: 'step1', type: 'console' },
        { name: 'step2', type: 'http' },
        { name: 'step1', type: 'console' }, // Duplicate name
      ],
    };

    const validation = validateStepNameUniqueness(workflowWithDuplicates);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toHaveLength(1);
    expect(validation.errors[0].stepName).toBe('step1');
    expect(validation.errors[0].occurrences).toBe(2);

    // Simulate what the service layer would do
    if (!validation.isValid) {
      const errorMessages = validation.errors.map((error) => error.message);
      const validationError = new WorkflowValidationError(
        'Workflow validation failed: Step names must be unique throughout the workflow.',
        errorMessages
      );

      expect(validationError.statusCode).toBe(400);
      expect(validationError.validationErrors).toEqual([
        'Step name "step1" is not unique. Found 2 steps with this name.',
      ]);

      // Simulate what the route handler would return
      const responseBody = validationError.toJSON();
      expect(responseBody).toEqual({
        error: 'Bad Request',
        message: 'Workflow validation failed: Step names must be unique throughout the workflow.',
        statusCode: 400,
        validationErrors: ['Step name "step1" is not unique. Found 2 steps with this name.'],
      });
    }
  });

  it('should demonstrate proper 400 error format for complex nested duplicates', () => {
    const complexWorkflow: WorkflowYaml = {
      version: '1',
      name: 'Complex Workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        { name: 'root_step', type: 'console' },
        {
          name: 'foreach_step',
          type: 'foreach',
          foreach: 'items',
          steps: [
            { name: 'root_step', type: 'console' }, // Duplicate with root
            { name: 'nested_step', type: 'http' },
          ],
        },
        {
          name: 'if_step',
          type: 'if',
          condition: 'true',
          steps: [{ name: 'nested_step', type: 'console' }], // Duplicate with nested
          else: [{ name: 'root_step', type: 'http' }], // Another duplicate with root
        },
      ],
    };

    const validation = validateStepNameUniqueness(complexWorkflow);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toHaveLength(2); // root_step and nested_step

    const errorMessages = validation.errors.map((error) => error.message);
    const validationError = new WorkflowValidationError(
      'Workflow validation failed: Step names must be unique throughout the workflow.',
      errorMessages
    );

    const responseBody = validationError.toJSON();

    expect(responseBody.statusCode).toBe(400);
    expect(responseBody.error).toBe('Bad Request');
    expect(responseBody.validationErrors).toHaveLength(2);
    expect(responseBody.validationErrors).toContain(
      'Step name "root_step" is not unique. Found 3 steps with this name.'
    );
    expect(responseBody.validationErrors).toContain(
      'Step name "nested_step" is not unique. Found 2 steps with this name.'
    );
  });
});
