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
import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import type { WorkflowYAMLEditorProps } from './workflow_yaml_editor';
import { WorkflowYAMLEditor } from './workflow_yaml_editor';
import { setActiveTab, setExecution, setYamlString } from '../../../entities/workflows/store';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import type { YamlEditorProps } from '../../../shared/ui';
import { getCompletionItemProvider } from '../lib/autocomplete/get_completion_item_provider';

// Mock the YamlEditor component to avoid Monaco complexity in tests
jest.mock('../../../shared/ui/yaml_editor', () => ({
  YamlEditor: ({ value, onChange, editorDidMount, ...props }: YamlEditorProps) => (
    <div data-testid="yaml-editor">
      <textarea
        ref={(el) => {
          const editorMock = {
            getModel: jest.fn(),
            dispose: jest.fn(),
          } as unknown as monaco.editor.IStandaloneCodeEditor;
          if (el) {
            editorDidMount?.(editorMock);
          }
        }}
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

const mockCompletionProvider = {
  triggerCharacters: ['@', '.', ' ', '|', '{'],
  provideCompletionItems: jest.fn(),
};

jest.mock('../lib/autocomplete/get_completion_item_provider', () => ({
  getCompletionItemProvider: jest.fn(() => mockCompletionProvider),
}));

jest.mock('@kbn/monaco', () => ({
  monaco: {
    editor: {
      setModelMarkers: jest.fn(),
    },
    languages: {
      registerCompletionItemProvider: jest.fn().mockReturnValue({
        dispose: jest.fn(),
      }),
    },
  },
  YAML_LANG_ID: 'yaml',
}));

describe('WorkflowYAMLEditor', () => {
  const defaultProps: WorkflowYAMLEditorProps = {
    onStepRun: jest.fn(),
  };

  const renderWithProviders = (
    component: React.ReactElement,
    store?: ReturnType<typeof createMockStore>
  ) => {
    const testStore = store || createMockStore();
    return render(
      <MemoryRouter>
        <I18nProviderMock>
          <Provider store={testStore}>{component}</Provider>
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
      const store = createMockStore();
      store.dispatch(setYamlString(yamlWithAlertTrigger));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
    });

    it('renders in readOnly mode when isExecutionYaml is true', () => {
      const store = createMockStore();
      store.dispatch(setActiveTab('executions'));
      store.dispatch(
        setExecution({
          id: 'test-execution-id',
          yaml: yamlWithAlertTrigger,
        } as any)
      );

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

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

      const store = createMockStore();
      store.dispatch(setYamlString(invalidYaml));
      store.dispatch(setActiveTab('workflow'));

      // Should not throw an error
      expect(() => {
        renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);
      }).not.toThrow();

      expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
    });
  });

  describe('editor initialization', () => {
    it('renders correctly when editor mounts with content', () => {
      const yamlContent = 'version: "1"\nname: "test"';
      const store = createMockStore();
      store.dispatch(setYamlString(yamlContent));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
      expect(document.querySelector('[data-testid="yaml-textarea"]')).toBeInTheDocument();

      const textarea = document.querySelector(
        '[data-testid="yaml-textarea"]'
      ) as HTMLTextAreaElement;
      expect(textarea?.value).toBe(yamlContent);
    });
  });

  describe('completion provider', () => {
    let completionProvider: monaco.languages.CompletionItemProvider;

    beforeEach(() => {
      completionProvider = getCompletionItemProvider(() => createMockStore().getState().detail);
    });

    it('registers the completion provider when the editor mounts', () => {
      const yamlContent = 'version: "1"\nname: "test"';
      const store = createMockStore();
      store.dispatch(setYamlString(yamlContent));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      // Verify that registerCompletionItemProvider was called with the correct parameters
      expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
        YAML_LANG_ID,
        mockCompletionProvider
      );

      // Verify that getCompletionItemProvider was called
      expect(getCompletionItemProvider).toHaveBeenCalled();

      // Get the second argument passed to registerCompletionItemProvider
      const registeredProvider = (monaco.languages.registerCompletionItemProvider as jest.Mock).mock
        .calls[0][1];

      // Verify it's the same object returned by our mock
      expect(registeredProvider).toBe(mockCompletionProvider);
      expect(registeredProvider).toHaveProperty('triggerCharacters', ['@', '.', ' ', '|', '{']);
      expect(registeredProvider).toHaveProperty('provideCompletionItems');
    });

    it('should dispose the completion provider when the editor unmounts', () => {
      const yamlContent = 'version: "1"\nname: "test"';
      const store = createMockStore();
      store.dispatch(setYamlString(yamlContent));
      store.dispatch(setActiveTab('workflow'));

      const { unmount } = renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      const registeredProvider = (monaco.languages.registerCompletionItemProvider as jest.Mock).mock
        .results[0].value;

      unmount();

      // Verify that dispose was called on the completion provider
      expect(registeredProvider.dispose).toHaveBeenCalled();
    });
  });
});
