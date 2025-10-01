/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { I18nProviderMock } from '@kbn/core-i18n-browser-mocks/src/i18n_context_mock';
import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { WorkflowYAMLEditorProps } from './workflow_yaml_editor';
import { WorkflowYAMLEditor } from './workflow_yaml_editor';

// Mock the YamlEditor component to avoid Monaco complexity in tests
jest.mock('../../../shared/ui/yaml_editor', () => ({
  YamlEditor: ({ value, onChange, ...props }: any) => (
    <div data-testid="yaml-editor">
      <textarea
        value={value || ''}
        onChange={(e: any) => onChange?.(e.target.value)}
        data-testid="yaml-textarea"
      />
    </div>
  ),
}));

// Mock the validation hook
jest.mock('../lib/use_yaml_validation', () => ({
  useYamlValidation: () => ({
    error: null,
    validationErrors: [],
    validateVariables: jest.fn(),
    handleMarkersChanged: jest.fn(),
  }),
}));

// Mock the completion provider
jest.mock('../lib/get_completion_item_provider', () => ({
  getCompletionItemProvider: () => ({}),
}));

// Mock the UnsavedChangesPrompt
jest.mock('../../../shared/ui/unsaved_changes_prompt', () => ({
  UnsavedChangesPrompt: () => null,
}));

// Mock the validation errors component
jest.mock('./workflow_yaml_validation_errors', () => ({
  WorkflowYAMLValidationErrors: () => null,
}));

describe('WorkflowYAMLEditor', () => {
  const defaultProps: WorkflowYAMLEditorProps = {
    value: '',
    workflowId: 'test-workflow',
  };

  const renderWithI18n = (component: React.ReactElement) => {
    return render(
      <MemoryRouter>
        <I18nProviderMock>{component}</I18nProviderMock>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithI18n(<WorkflowYAMLEditor {...defaultProps} />);
    expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
  });

  it('calls onChange when editor content changes', async () => {
    const onChangeMock = jest.fn();
    renderWithI18n(<WorkflowYAMLEditor {...defaultProps} onChange={onChangeMock} />);

    const textarea = document.querySelector('[data-testid="yaml-textarea"]') as HTMLTextAreaElement;
    const newValue = 'version: "1"\nname: "test"';

    // Simulate typing using React Testing Library
    fireEvent.change(textarea, { target: { value: newValue } });

    await waitFor(() => {
      expect(onChangeMock).toHaveBeenCalledWith(newValue);
    });
  });

  describe('alert trigger decorations', () => {
    const yamlWithAlertTrigger = `
version: "1"
name: "test workflow"
triggers:
  - type: alert
    with:
      rule_id: "test-rule"
steps:
  - name: step1
    type: console.log
    with:
      message: "Alert triggered!"
`.trim();

    it('renders without crashing with alert trigger YAML', () => {
      renderWithI18n(
        <WorkflowYAMLEditor {...defaultProps} value={yamlWithAlertTrigger} readOnly={false} />
      );

      expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
    });

    it('renders in readOnly mode', () => {
      renderWithI18n(
        <WorkflowYAMLEditor {...defaultProps} value={yamlWithAlertTrigger} readOnly={true} />
      );

      expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
    });

    it('handles invalid YAML gracefully', () => {
      const invalidYaml = `
version: "1"
name: "test workflow"
triggers:
  - type: alert
    with:
      rule_id: "test-rule"
      invalid: [ unclosed array
steps:
  - name: step1
`.trim();

      // Should not throw an error
      expect(() => {
        renderWithI18n(
          <WorkflowYAMLEditor {...defaultProps} value={invalidYaml} readOnly={false} />
        );
      }).not.toThrow();

      expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
    });
  });

  describe('editor initialization', () => {
    it('renders correctly when editor mounts with content', () => {
      const yamlContent = 'version: "1"\nname: "test"';

      renderWithI18n(<WorkflowYAMLEditor {...defaultProps} value={yamlContent} />);

      expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
      expect(document.querySelector('[data-testid="yaml-textarea"]')).toBeInTheDocument();

      const textarea = document.querySelector(
        '[data-testid="yaml-textarea"]'
      ) as HTMLTextAreaElement;
      expect(textarea?.value).toBe(yamlContent);
    });
  });
});
