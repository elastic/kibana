/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import type { WorkflowYAMLEditorProps } from './workflow_yaml_editor';
import { WorkflowYAMLEditor } from './workflow_yaml_editor';
import { useSaveYaml } from '../../../entities/workflows/model/use_save_yaml';
import {
  setActiveTab,
  setExecution,
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { saveYamlThunk } from '../../../entities/workflows/store/workflow_detail/thunks/save_yaml_thunk';
import { mockWorkflowsManagementCapabilities } from '../../../hooks/__mocks__/use_workflows_capabilities';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockWorkflowExecutionDto } from '../../../shared/test_utils/mock_workflow_factories';
import { getCompletionItemProvider } from '../lib/autocomplete/get_completion_item_provider';

// Mock the YamlEditor component to avoid Monaco complexity in tests.
// Uses createMockMonacoEditor (which includes getVisibleRanges, onDid* listeners,
// revealLineInCenter, etc.) instead of a hand-rolled inline mock, so the minimap's
// viewport-tracking code path is exercised without needing the real Monaco environment.
vi.mock('../../../shared/ui/yaml_editor', async () => {
  // require() is mandatory here: jest.mock factories run before ES-import transforms.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createMockMonacoEditor } = await import('../../../shared/test_utils/mock_monaco');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createElement } = require('react');
  return {
    YamlEditor: ({ value, onChange, editorDidMount, options }: any) => {
      return createElement(
        'div',
        { 'data-testid': 'yaml-editor' },
        createElement('textarea', {
          ref: (el: HTMLTextAreaElement | null): void => {
            if (el) {
              // getModel returns undefined so handleEditorDidMount skips provider
              // registration (the `if (!model) return` guard). This keeps the
              // YamlEditor mock minimal — provider registration is separately mocked.
              editorDidMount?.(
                createMockMonacoEditor(value ?? '', { getModel: vi.fn() } as any).editor
              );
            }
          },
          value: value || '',
          onChange: (e: any) => onChange?.(e.target.value),
          readOnly: Boolean(options?.readOnly),
          'data-testid': 'yaml-textarea',
        })
      );
    },
  };
});

// Mock the validation hook
vi.mock('../../../features/validate_workflow_yaml/lib/use_yaml_validation', () => {
  const mocked = {
    useYamlValidation: () => ({
      error: null,
      isLoading: false,
      validationResults: [],
    }),
  };
  return { ...mocked, default: mocked };
});

// Mock the UnsavedChangesPrompt
vi.mock('../../../shared/ui/unsaved_changes_prompt', () => {
  const mocked = {
    UnsavedChangesPrompt: () => null,
  };
  return { ...mocked, default: mocked };
});

// Mock the validation errors component
vi.mock('./workflow_yaml_validation_accordion', () => {
  const mocked = {
    WorkflowYamlValidationAccordion: () => null,
  };
  return { ...mocked, default: mocked };
});

// Mock the useAvailableConnectors hook
vi.mock('../../../entities/connectors/model/use_available_connectors', () => {
  const mocked = {
    useAvailableConnectors: vi.fn().mockReturnValue({
      connectorTypes: {},
      totalConnectors: 0,
    }),
  };
  return { ...mocked, default: mocked };
});

const mockSaveYaml = vi.fn();
const mockUseSaveYaml = useSaveYaml as MockedFunction<typeof useSaveYaml>;
const mockUseParams = vi.fn();

// Mock the useSaveYaml hook - now returns just the function, not an array
vi.mock('../../../entities/workflows/model/use_save_yaml', () => {
  const mocked = {
    useSaveYaml: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useParams: () => mockUseParams(),
  };
  return { ...mocked, default: mocked };
});

const mockKqlStart = kqlPluginMock.createStartContract();
const mockFieldFormatsStart = fieldFormatsServiceMock.createStartContract();

// Mock the useKibana hook
vi.mock('../../../hooks/use_kibana', () => {
  const mocked = {
    useKibana: vi.fn(() => ({
      services: {
        http: {},
        notifications: {
          toasts: {
            addSuccess: vi.fn(),
            addError: vi.fn(),
          },
        },
        kql: mockKqlStart,
        fieldFormats: mockFieldFormatsStart,
      },
    })),
  };
  return { ...mocked, default: mocked };
});

const mockRegisterKeyboardCommands = vi.fn();
const mockUnregisterKeyboardCommands = vi.fn();
let capturedKeyboardHandlers: {
  save?: () => void;
  run?: () => void;
  saveAndRun?: () => void;
} = {};

vi.mock('../lib/use_register_keyboard_commands', () => {
  const mocked = {
    useRegisterKeyboardCommands: vi.fn(() => ({
      registerKeyboardCommands: (params: any) => {
        capturedKeyboardHandlers = {
          save: params.save,
          run: params.run,
          saveAndRun: params.saveAndRun,
        };
        mockRegisterKeyboardCommands(params);
      },
      unregisterKeyboardCommands: mockUnregisterKeyboardCommands,
    })),
  };
  return { ...mocked, default: mocked };
});

const mockRegisterHoverCommands = vi.fn();
const mockUnregisterHoverCommands = vi.fn();
vi.mock('../lib/use_register_hover_commands', () => {
  const mocked = {
    useRegisterHoverCommands: vi.fn(() => ({
      registerHoverCommands: (params: any) => {
        mockRegisterHoverCommands(params);
      },
      unregisterHoverCommands: mockUnregisterHoverCommands,
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./step_actions', () => {
  const mocked = {
    StepActions: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./actions_menu_button', () => {
  const mocked = {
    ActionsMenuButton: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./decorations', () => {
  const mocked = {
    useAlertTriggerDecorations: vi.fn(),
    useConnectorTypeDecorations: vi.fn(),
    useFocusedStepDecoration: vi.fn(),
    useLineDifferencesDecorations: vi.fn(),
    useStepDecorationsInExecution: vi.fn(() => ({ styles: {} })),
    useTriggerTypeDecorations: vi.fn(),
    useWorkflowEventsOnDecorations: vi.fn(),
    useWorkflowIdDecorations: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../styles/use_workflow_editor_styles', () => {
  const mocked = {
    useWorkflowEditorStyles: vi.fn(() => ({})),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/workflows-ui', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/workflows-ui')),
    useWorkflowsCapabilities: vi.fn(),
    useWorkflowsMonacoTheme: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as MockedFunction<
  typeof useWorkflowsCapabilities
>;

vi.mock('../styles/use_dynamic_type_icons', () => {
  const mocked = {
    useDynamicTypeIcons: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../styles/global_workflow_editor_styles', () => {
  const mocked = {
    GlobalWorkflowEditorStyles: () => null,
  };
  return { ...mocked, default: mocked };
});

let mockCloseActionsPopover: (() => void) | undefined;
vi.mock('../../../features/actions_menu_popover', () => {
  const mocked = {
    ActionsMenuPopover: ({ closePopover }: { closePopover: () => void }) => {
      mockCloseActionsPopover = closePopover;
      return null;
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../lib/utils', () => {
  const mocked = {
    navigateToErrorPosition: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../features/validate_workflow_yaml/model/use_workflow_json_schema', () => {
  const mocked = {
    useWorkflowJsonSchema: vi.fn(() => ({
      jsonSchema: null,
      uri: null,
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock(
  '../../../features/validate_workflow_yaml/lib/use_monaco_markers_changed_interceptor',
  () => {
    const mocked = {
      useMonacoMarkersChangedInterceptor: vi.fn(() => ({
        validationErrors: [],
        transformMonacoMarkers: vi.fn(),
        handleMarkersChanged: vi.fn(),
      })),
    };
    return { ...mocked, default: mocked };
  }
);

const mockCompletionProvider = {
  triggerCharacters: ['@', '.', ' ', '|', '{'],
  provideCompletionItems: vi.fn(),
};

vi.mock('../lib/esql_validation/use_workflow_esql_callbacks', () => {
  const mocked = {
    useWorkflowEsqlCallbacks: () => ({}),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../lib/autocomplete/get_completion_item_provider', () => {
  const mocked = {
    getCompletionItemProvider: vi.fn(() => mockCompletionProvider),
  };
  return { ...mocked, default: mocked };
});

// Mock interceptMonacoYamlProvider to be a no-op so the original mock remains
vi.mock('../lib/autocomplete/intercept_monaco_yaml_provider', () => {
  const mocked = {
    interceptMonacoYamlProvider: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./hooks/use_agent_builder_integration', () => {
  const mocked = {
    useAgentBuilderIntegration: vi.fn(() => ({
      openAgentChat: vi.fn(),
      isAgentBuilderAvailable: false,
      proposalManager: null,
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/monaco', () => {
  const mocked = {
    monaco: {
      editor: {
        setModelMarkers: vi.fn(),
        registerCommand: vi.fn().mockReturnValue({
          dispose: vi.fn(),
        }),
      },
      languages: {
        registerCompletionItemProvider: vi.fn().mockReturnValue({
          dispose: vi.fn(),
        }),
        registerCodeActionProvider: vi.fn().mockReturnValue({
          dispose: vi.fn(),
        }),
      },
    },
    YAML_LANG_ID: 'yaml',
  };
  return { ...mocked, default: mocked };
});

describe('WorkflowYAMLEditor', () => {
  const defaultProps: WorkflowYAMLEditorProps = {
    onStepRun: vi.fn(),
    editorRef: { current: null },
  };
  const mockWorkflow = {
    id: 'test-123',
    name: 'Test Workflow',
    enabled: true,
    yaml: 'version: "1"\nname: "test"',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    lastUpdatedBy: 'test-user',
    definition: null,
    valid: true,
  };

  const renderWithProviders = (
    component: React.ReactElement,
    store?: ReturnType<typeof createMockStore>,
    initialEntries?: string[]
  ) => {
    return render(component, { wrapper: getTestProvider({ store, initialEntries }) });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedKeyboardHandlers = {};
    mockCloseActionsPopover = undefined;
    defaultProps.editorRef.current = null;
    mockSaveYaml.mockResolvedValue(undefined);
    // useSaveYaml now returns just the function, not an array
    mockUseSaveYaml.mockReturnValue(mockSaveYaml);
    mockUseWorkflowsCapabilities.mockReturnValue(mockWorkflowsManagementCapabilities);
    mockUseParams.mockReturnValue({ id: 'test-123' });
  });

  it('renders without crashing', async () => {
    renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />);
    // Wait for async state updates (setTimeout in handleEditorDidMount)
    await waitFor(() => {
      expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
    });
  });

  it('restores editor focus when the actions menu closes', async () => {
    renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />);

    await waitFor(() => {
      expect(mockCloseActionsPopover).toBeDefined();
      expect(defaultProps.editorRef.current).not.toBeNull();
    });

    const requestAnimationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback(0);
        return 0;
      });

    try {
      const focus = defaultProps.editorRef.current?.focus as Mock;
      focus.mockClear();

      act(() => mockCloseActionsPopover?.());

      expect(focus).toHaveBeenCalledTimes(1);
    } finally {
      requestAnimationFrame.mockRestore();
    }
  });

  it('updates store when editor content changes', async () => {
    const store = createMockStore();
    const { container } = renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

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

  it('renders managed workflow YAML as read-only', async () => {
    const store = createMockStore();
    store.dispatch(setWorkflow({ ...mockWorkflow, managed: true }));
    store.dispatch(setYamlString(mockWorkflow.yaml));
    store.dispatch(setActiveTab('workflow'));

    renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

    await waitFor(() => {
      const textarea = document.querySelector(
        '[data-testid="yaml-textarea"]'
      ) as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      expect(textarea.readOnly).toBe(true);
    });
  });

  it('does not update YAML for managed workflows when change events fire', async () => {
    const store = createMockStore();
    store.dispatch(setWorkflow({ ...mockWorkflow, managed: true }));
    store.dispatch(setYamlString(mockWorkflow.yaml));
    store.dispatch(setActiveTab('workflow'));

    renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

    const textarea = document.querySelector('[data-testid="yaml-textarea"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'version: "1"\nname: "changed"' } });

    await waitFor(() => {
      expect(store.getState().detail.yamlString).toBe(mockWorkflow.yaml);
    });
  });

  it('renders workflow YAML as read-only without update privileges', async () => {
    const store = createMockStore();
    store.dispatch(setWorkflow(mockWorkflow));
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...mockWorkflowsManagementCapabilities,
      canUpdateWorkflow: false,
    });

    renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

    await waitFor(() => {
      const textarea = document.querySelector(
        '[data-testid="yaml-textarea"]'
      ) as HTMLTextAreaElement;
      expect(textarea.readOnly).toBe(true);
    });
  });

  it('renders workflow YAML as read-only on the executions tab without a selection', async () => {
    const store = createMockStore();
    store.dispatch(setWorkflow(mockWorkflow));
    store.dispatch(setActiveTab('executions'));

    renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store, ['/?tab=executions']);

    await waitFor(() => {
      const textarea = document.querySelector(
        '[data-testid="yaml-textarea"]'
      ) as HTMLTextAreaElement;
      expect(textarea.readOnly).toBe(true);
    });
  });

  it('keeps cached execution YAML read-only while the selection is cleared', async () => {
    const store = createMockStore();
    store.dispatch(setWorkflow(mockWorkflow));
    store.dispatch(setActiveTab('executions'));
    store.dispatch(
      setExecution(
        createMockWorkflowExecutionDto({
          id: 'test-execution-id',
          yaml: mockWorkflow.yaml,
        })
      )
    );

    renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store, ['/?tab=executions']);

    await waitFor(() => {
      const textarea = document.querySelector(
        '[data-testid="yaml-textarea"]'
      ) as HTMLTextAreaElement;
      expect(textarea.readOnly).toBe(true);
    });
  });

  describe('alert trigger decorations', () => {
    const yamlWithAlertTrigger = `
version: "1"
name: "test workflow"
triggers:
  - type: alert
steps:
  - name: step1
    type: console.log
    with:
      message: "Alert triggered!"
`.trim();

    it('renders without crashing with alert trigger YAML', async () => {
      const store = createMockStore();
      store.dispatch(setYamlString(yamlWithAlertTrigger));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      // Wait for async state updates (setTimeout in handleEditorDidMount)
      await waitFor(() => {
        expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
      });
    });

    it('renders selected execution YAML as read-only', async () => {
      const store = createMockStore();
      store.dispatch(setActiveTab('executions'));
      store.dispatch(
        setExecution(
          createMockWorkflowExecutionDto({
            id: 'test-execution-id',
            yaml: yamlWithAlertTrigger,
          })
        )
      );

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store, [
        '/?tab=executions&executionId=test-execution-id',
      ]);

      await waitFor(() => {
        const textarea = document.querySelector(
          '[data-testid="yaml-textarea"]'
        ) as HTMLTextAreaElement;
        expect(textarea.readOnly).toBe(true);
      });
    });

    it('handles invalid YAML gracefully', async () => {
      const invalidYaml = `
version: "1"
name: "test workflow"
triggers:
  - type: alert
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

      // Wait for async state updates (setTimeout in handleEditorDidMount)
      await waitFor(() => {
        expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
      });
    });
  });

  describe('editor initialization', () => {
    it('renders correctly when editor mounts with content', async () => {
      const yamlContent = 'version: "1"\nname: "test"';
      const store = createMockStore();
      store.dispatch(setYamlString(yamlContent));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      // Wait for async state updates (setTimeout in handleEditorDidMount)
      await waitFor(() => {
        expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
        expect(document.querySelector('[data-testid="yaml-textarea"]')).toBeInTheDocument();
      });

      const textarea = document.querySelector(
        '[data-testid="yaml-textarea"]'
      ) as HTMLTextAreaElement;
      expect(textarea?.value).toBe(yamlContent);
    });
  });

  describe('completion provider', () => {
    it('registers the completion provider when the editor mounts', async () => {
      const yamlContent = 'version: "1"\nname: "test"';
      const store = createMockStore();
      store.dispatch(setYamlString(yamlContent));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      // Wait for async state updates (setTimeout in handleEditorDidMount)
      await waitFor(() => {
        // Verify that registerCompletionItemProvider was called with the correct parameters
        expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
          YAML_LANG_ID,
          mockCompletionProvider
        );
      });

      // Verify that getCompletionItemProvider was called
      expect(getCompletionItemProvider).toHaveBeenCalled();

      // Get the second argument passed to registerCompletionItemProvider
      const registeredProvider = (monaco.languages.registerCompletionItemProvider as Mock).mock
        .calls[0][1];

      // Verify it's the same object returned by our mock
      expect(registeredProvider).toBe(mockCompletionProvider);
      expect(registeredProvider).toHaveProperty('triggerCharacters', ['@', '.', ' ', '|', '{']);
      expect(registeredProvider).toHaveProperty('provideCompletionItems');
    });

    it('should dispose the completion provider when the editor unmounts', async () => {
      const yamlContent = 'version: "1"\nname: "test"';
      const store = createMockStore();
      store.dispatch(setYamlString(yamlContent));
      store.dispatch(setActiveTab('workflow'));

      const mockDispose = vi.fn();
      (monaco.languages.registerCompletionItemProvider as Mock).mockReturnValue({
        dispose: mockDispose,
      });

      const { unmount } = renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);
      // Wait for async state updates (setTimeout in handleEditorDidMount)
      await waitFor(() => {
        expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalled();
      });

      unmount();

      // Verify that dispose was called on the completion provider
      expect(mockDispose).toHaveBeenCalled();
    });
  });

  describe('monaco markers monkey patching', () => {
    it('should call original setModelMarkers for models that do not match the current editor', async () => {
      const store = createMockStore();
      store.dispatch(setYamlString('version: "1"\nname: "test"'));
      store.dispatch(setActiveTab('workflow'));

      const originalSetModelMarkers = monaco.editor.setModelMarkers;
      const setModelMarkersSpy = vi.fn();
      monaco.editor.setModelMarkers = setModelMarkersSpy;

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      // Wait for the component to mount and monkey patching to be applied
      await waitFor(() => {
        expect(document.querySelector('[data-testid="yaml-editor"]')).toBeInTheDocument();
      });

      // Create a mock model with a different URI than the editor's model
      const mockModel = {
        uri: {
          path: '/different/model/path',
          toString: () => 'inmemory://different/model',
        },
      } as any;

      const mockOwner = 'test-owner';
      const mockMarkers = [
        {
          severity: 8,
          message: 'Test error',
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 10,
        },
      ];

      // Get the monkey-patched function
      const monkeyPatchedSetModelMarkers = monaco.editor.setModelMarkers;

      // Call the monkey-patched function with a different model
      monkeyPatchedSetModelMarkers(mockModel, mockOwner, mockMarkers);

      // Verify that the original setModelMarkers was called (not skipped)
      expect(setModelMarkersSpy).toHaveBeenCalledWith(mockModel, mockOwner, mockMarkers);

      // Restore original function
      monaco.editor.setModelMarkers = originalSetModelMarkers;
    });
  });

  describe('keyboard commands', () => {
    it('should register keyboard commands when editor mounts', async () => {
      const store = createMockStore();
      store.dispatch(setYamlString('version: "1"\nname: "test"'));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      // Wait for async state updates (setTimeout in handleEditorDidMount)
      await waitFor(() => {
        expect(mockRegisterKeyboardCommands).toHaveBeenCalled();
      });

      const callArgs = mockRegisterKeyboardCommands.mock.calls[0][0];
      expect(callArgs).toHaveProperty('save');
      expect(callArgs).toHaveProperty('run');
      expect(callArgs).toHaveProperty('saveAndRun');
    });

    it('should call save handler when save keyboard shortcut is triggered', () => {
      const store = createMockStore();
      store.dispatch(setYamlString('version: "1"\nname: "test"'));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      expect(capturedKeyboardHandlers.save).toBeDefined();
      capturedKeyboardHandlers.save!();

      expect(mockSaveYaml).toHaveBeenCalledTimes(1);
    });

    it('should prevent multiple saves when one is already in progress', async () => {
      const store = createMockStore();
      store.dispatch(setYamlString('version: "1"\nname: "test"'));
      store.dispatch(setActiveTab('workflow'));

      // Set loading state to true in the store to simulate a save in progress
      store.dispatch(saveYamlThunk.pending('', undefined));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      // Wait for handlers to be registered
      await waitFor(() => {
        expect(capturedKeyboardHandlers.save).toBeDefined();
      });

      // Try to save multiple times
      capturedKeyboardHandlers.save!();
      capturedKeyboardHandlers.save!();
      capturedKeyboardHandlers.save!();

      // Should not call saveYaml because isSaving is true
      expect(mockSaveYaml).not.toHaveBeenCalled();
    });

    it('should call saveAndRun handler when saveAndRun keyboard shortcut is triggered', () => {
      const store = createMockStore();
      store.dispatch(setYamlString('version: "1"\nname: "test"'));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      expect(capturedKeyboardHandlers.saveAndRun).toBeDefined();
      capturedKeyboardHandlers.saveAndRun!();

      expect(mockSaveYaml).toHaveBeenCalledTimes(1);
    });

    it('should prevent multiple saveAndRun when one is already in progress', async () => {
      const store = createMockStore();
      store.dispatch(setYamlString('version: "1"\nname: "test"'));
      store.dispatch(setActiveTab('workflow'));

      // Set loading state to true in the store to simulate a save in progress
      store.dispatch(saveYamlThunk.pending('', undefined));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      // Wait for handlers to be registered
      await waitFor(() => {
        expect(capturedKeyboardHandlers.saveAndRun).toBeDefined();
      });

      // Try to saveAndRun multiple times
      capturedKeyboardHandlers.saveAndRun!();
      capturedKeyboardHandlers.saveAndRun!();

      // Should not call saveYaml because isSaving is true
      expect(mockSaveYaml).not.toHaveBeenCalled();
    });

    it('should allow save after previous save completes', async () => {
      const store = createMockStore();
      store.dispatch(setYamlString('version: "1"\nname: "test"'));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      // Wait for handlers to be registered
      await waitFor(() => {
        expect(capturedKeyboardHandlers.save).toBeDefined();
      });

      // First save should work
      capturedKeyboardHandlers.save!();
      expect(mockSaveYaml).toHaveBeenCalledTimes(1);

      // Clear the mock call count and simulate save completing (still not loading)
      mockSaveYaml.mockClear();

      // Second save should also work since isSaving is false
      capturedKeyboardHandlers.save!();
      expect(mockSaveYaml).toHaveBeenCalledTimes(1);
    });

    it('should not save managed workflow YAML with keyboard shortcuts', async () => {
      const store = createMockStore();
      store.dispatch(setWorkflow({ ...mockWorkflow, managed: true }));
      store.dispatch(setYamlString(mockWorkflow.yaml));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      await waitFor(() => {
        expect(capturedKeyboardHandlers.save).toBeDefined();
        expect(capturedKeyboardHandlers.saveAndRun).toBeDefined();
      });

      capturedKeyboardHandlers.save!();
      capturedKeyboardHandlers.saveAndRun!();

      expect(mockSaveYaml).not.toHaveBeenCalled();
    });
  });

  describe('hover commands', () => {
    it('should register keyboard commands when editor mounts', async () => {
      const store = createMockStore();
      store.dispatch(setYamlString('version: "1"\nname: "test"'));
      store.dispatch(setActiveTab('workflow'));

      renderWithProviders(<WorkflowYAMLEditor {...defaultProps} />, store);

      // Wait for async state updates (setTimeout in handleEditorDidMount)
      await waitFor(() => {
        expect(mockRegisterHoverCommands).toHaveBeenCalled();
      });
    });
  });
});
