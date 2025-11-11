/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowExecuteManualForm } from './workflow_execute_manual_form';

const baseWorkflowDefinition = {
  version: '1',
  name: 'test-workflow',
  enabled: true,
  triggers: [{ type: 'manual' }],
  steps: [],
} as WorkflowYaml;

const renderWithProviders = (component: React.ReactElement) => {
  return render(component, { wrapper: I18nProvider });
};

describe('WorkflowExecuteManualForm - Input Merging', () => {
  let mockSetValue: jest.Mock;
  let mockSetErrors: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetValue = jest.fn();
    mockSetErrors = jest.fn();
  });

  it('should merge saved input when schema fields are added and removed', async () => {
    // Updated workflow schema: email removed, id added
    const updatedDefinition: WorkflowYaml = {
      ...baseWorkflowDefinition,
      inputs: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'id',
          type: 'string',
        },
        {
          name: 'department',
          type: 'string',
        },
        {
          name: 'priority',
          type: 'choice',
          options: ['low', 'medium', 'high'],
          default: 'low',
        },
      ],
    };

    // Saved input from previous schema version (has email, no id)
    const savedInput = JSON.stringify({
      name: 'John Doe',
      email: 'john.doe@elastic.co',
      department: 'Sales',
      priority: 'low',
    });

    renderWithProviders(
      <WorkflowExecuteManualForm
        definition={updatedDefinition}
        value={savedInput}
        setValue={mockSetValue}
        errors={null}
        setErrors={mockSetErrors}
      />
    );

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalled();
      const mergedInput = JSON.parse(mockSetValue.mock.calls[0][0]);

      // Preserved saved values
      expect(mergedInput.name).toBe('John Doe');
      expect(mergedInput.department).toBe('Sales');
      expect(mergedInput.priority).toBe('low');

      // New field added with default placeholder
      expect(mergedInput.id).toBe('Enter a string');

      // Removed field (email) should not exist
      expect(mergedInput.email).toBeUndefined();
    });
  });
});
