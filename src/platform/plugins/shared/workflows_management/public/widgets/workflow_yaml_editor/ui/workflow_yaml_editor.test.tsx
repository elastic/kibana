/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { I18nProviderMock } from '@kbn/core-i18n-browser-mocks/src/i18n_context_mock';
import type { WorkflowYAMLEditorProps } from './workflow_yaml_editor';
import { WorkflowYAMLEditor } from './workflow_yaml_editor';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';

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
jest.mock('../../../features/validate_workflow_yaml/lib/use_yaml_validation', () => ({
  useYamlValidation: () => ({
    error: null,
    isLoading: false,
    validateVariables: jest.fn(),
    handleMarkersChanged: jest.fn(),
  }),
}));

// Mock the completion provider
jest.mock('./hooks/use_completion_provider', () => ({
  useCompletionProvider: jest.fn().mockReturnValue({}),
}));

// Mock the UnsavedChangesPrompt
jest.mock('../../../shared/ui/unsaved_changes_prompt', () => ({
  UnsavedChangesPrompt: () => null,
}));

// Mock the validation errors component
jest.mock('./workflow_yaml_validation_errors', () => ({
  WorkflowYAMLValidationErrors: () => null,
}));

// Mock the useAvailableConnectors hook
jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useAvailableConnectors: jest.fn().mockReturnValue({
    connectorTypes: {},
    totalConnectors: 0,
  }),
}));

// Mock the useSaveYaml hook
jest.mock('../../../entities/workflows/model/use_save_yaml', () => ({
  useSaveYaml: jest.fn(() => jest.fn()),
}));

// Mock the useKibana hook
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(() => ({
    services: {
      http: {},
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addError: jest.fn(),
        },
      },
    },
  })),
}));

// Mock Monaco handlers
jest.mock('../lib/monaco_connectors', () => ({
  ElasticsearchMonacoConnectorHandler: jest.fn(),
  GenericMonacoConnectorHandler: jest.fn(),
  KibanaMonacoConnectorHandler: jest.fn(),
}));

jest.mock('../lib/monaco_providers', () => ({
  registerMonacoConnectorHandler: jest.fn(),
  registerUnifiedHoverProvider: jest.fn(() => jest.fn()),
}));

jest.mock('../lib/use_register_keyboard_commands', () => ({
  useRegisterKeyboardCommands: jest.fn(() => ({
    registerKeyboardCommands: jest.fn(),
    unregisterKeyboardCommands: jest.fn(),
  })),
}));

jest.mock('./step_actions', () => ({
  StepActions: () => null,
}));

jest.mock('./workflow_yaml_editor_shortcuts', () => ({
  WorkflowYAMLEditorShortcuts: () => null,
}));

jest.mock('./decorations', () => ({
  useAlertTriggerDecorations: jest.fn(),
  useConnectorTypeDecorations: jest.fn(),
  useFocusedStepOutline: jest.fn(() => ({ styles: {} })),
  useLineDifferencesDecorations: jest.fn(),
  useStepDecorationsInExecution: jest.fn(() => ({ styles: {} })),
  useTriggerTypeDecorations: jest.fn(),
}));

jest.mock('../styles/use_workflow_editor_styles', () => ({
  useWorkflowEditorStyles: jest.fn(() => ({})),
}));

jest.mock('../styles/use_workflows_monaco_theme', () => ({
  useWorkflowsMonacoTheme: jest.fn(),
}));

jest.mock('../styles/use_dynamic_type_icons', () => ({
  useDynamicTypeIcons: jest.fn(),
}));

jest.mock('../styles/global_workflow_editor_styles', () => ({
  GlobalWorkflowEditorStyles: () => null,
}));

jest.mock('../../../features/actions_menu_popover', () => ({
  ActionsMenuPopover: () => null,
}));

jest.mock('../lib/utils', () => ({
  navigateToErrorPosition: jest.fn(),
}));

jest.mock('../../../features/validate_workflow_yaml/model/use_workflow_json_schema', () => ({
  useWorkflowJsonSchema: jest.fn(() => ({
    jsonSchema: null,
    uri: null,
  })),
}));

jest.mock(
  '../../../features/validate_workflow_yaml/lib/use_monaco_markers_changed_interceptor',
  () => ({
    useMonacoMarkersChangedInterceptor: jest.fn(() => ({
      validationErrors: [],
      transformMonacoMarkers: jest.fn(),
      handleMarkersChanged: jest.fn(),
    })),
  })
);

describe('WorkflowYAMLEditor', () => {
  const defaultProps: WorkflowYAMLEditorProps = {
    workflowYaml: '',
  };

  const renderWithProviders = (component: React.ReactElement) => {
    const store = createMockStore();
    return render(
      <MemoryRouter>
        <I18nProviderMock>
          <Provider store={store}>{component}</Provider>
        </I18nProviderMock>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />);
    expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
  });

  it('updates store when editor content changes', async () => {
    const store = createMockStore();
    const { container } = render(
      <MemoryRouter>
        <I18nProviderMock>
          <Provider store={store}>
            <WorkflowYAMLEditor {...defaultProps} />
          </Provider>
        </I18nProviderMock>
      </MemoryRouter>
    );

    const textarea = container.querySelector(
      '[data-testid="yaml-textarea"]'
    ) as HTMLTextAreaElement;
    const newValue = 'version: "1"\nname: "test"';

    // Simulate typing using React Testing Library
    fireEvent.change(textarea, { target: { value: newValue } });

    // Wait for the store to be updated (the component uses setTimeout to defer state updates)
    await waitFor(() => {
      expect(store.getState().detail.yamlString).toBe(newValue);
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
      renderWithProviders(
        <WorkflowYAMLEditor
          {...defaultProps}
          workflowYaml={yamlWithAlertTrigger}
          isExecutionYaml={false}
        />
      );

      expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
    });

    it('renders in readOnly mode when isExecutionYaml is true', () => {
      renderWithProviders(
        <WorkflowYAMLEditor
          {...defaultProps}
          workflowYaml={yamlWithAlertTrigger}
          isExecutionYaml={true}
        />
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
        renderWithProviders(
          <WorkflowYAMLEditor
            {...defaultProps}
            workflowYaml={invalidYaml}
            isExecutionYaml={false}
          />
        );
      }).not.toThrow();

      expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
    });
  });

  describe('editor initialization', () => {
    it('renders correctly when editor mounts with content', () => {
      const yamlContent = 'version: "1"\nname: "test"';

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} workflowYaml={yamlContent} />);

      expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
      expect(document.querySelector('[data-testid="yaml-textarea"]')).toBeInTheDocument();

      const textarea = document.querySelector(
        '[data-testid="yaml-textarea"]'
      ) as HTMLTextAreaElement;
      expect(textarea?.value).toBe(yamlContent);
    });
  });
});
