/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { monaco } from '@kbn/monaco';
import { isTriggerType } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import type { SchemasSettings } from 'monaco-yaml';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type YAML from 'yaml';
import { useDispatch, useSelector } from 'react-redux';
import { useHandleMarkersChanged } from '../../../features/validate_workflow_yaml/lib/use_handle_markers_changed';
import { getWorkflowZodSchemaLoose } from '../../../../common/schema';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';
import { UnsavedChangesPrompt } from '../../../shared/ui/unsaved_changes_prompt';
import { YamlEditor } from '../../../shared/ui/yaml_editor';
import { getCompletionItemProvider } from '../lib/get_completion_item_provider';
import {
  ElasticsearchMonacoConnectorHandler,
  GenericMonacoConnectorHandler,
  KibanaMonacoConnectorHandler,
} from '../lib/monaco_connectors';
import {
  registerMonacoConnectorHandler,
  registerUnifiedHoverProvider,
} from '../lib/monaco_providers';
import { useYamlValidation } from '../../../features/validate_workflow_yaml/lib/use_yaml_validation';
import { navigateToErrorPosition } from '../lib/utils';
import { StepActions } from './step_actions';
import type { YamlValidationResult } from '../../../features/validate_workflow_yaml/model/types';
import { ActionsMenuPopover } from '../../../features/actions_menu_popover';
import type { ActionOptionData } from '../../../features/actions_menu_popover/types';
import { WorkflowYAMLValidationErrors } from './workflow_yaml_validation_errors';
import { WorkflowYAMLEditorShortcuts } from './workflow_yaml_editor_shortcuts';
import { insertTriggerSnippet } from '../lib/snippets/insert_trigger_snippet';
import { insertStepSnippet } from '../lib/snippets/insert_step_snippet';
import { useRegisterKeyboardCommands } from '../lib/use_register_keyboard_commands';
import type { StepInfo } from '../lib/store';
import {
  selectFocusedStepInfo,
  selectYamlDocument,
  setCursorPosition,
  setStepExecutions,
  setYamlString,
} from '../lib/store';
import {
  useFocusedStepOutline,
  useStepDecorationsInExecution,
  useTriggerTypeDecorations,
  useConnectorTypeDecorations,
  useLineDifferencesDecorations,
  useAlertTriggerDecorations,
} from '../lib/hooks';
import { useWorkflowJsonSchema } from '../../../features/validate_workflow_yaml/model/use_workflow_json_schema';
import { useWorkflowsMonacoTheme } from './use_workflows_monaco_theme';
import { useWorkflowEditorStyles } from '../styles/use_workflow_editor_styles';
import { useMonacoWorkflowStyles } from '../styles/use_monaco_workflow_styles';
import { registerWorkflowYamlLanguage } from '../lib/monaco_language/workflow_yaml';
import { useDynamicConnectorIcons } from './use_dynamic_connector_icons';
import { getMonacoMarkerInterceptor } from '../lib/get_monaco_marker_interceptor';

const WorkflowSchemaUri = 'file:///workflow-schema.json';

const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  automaticLayout: true,
  lineNumbers: 'on',
  glyphMargin: true,
  scrollBeyondLastLine: false,
  tabSize: 2,
  lineNumbersMinChars: 2,
  insertSpaces: true,
  fontSize: 14,
  renderWhitespace: 'none',
  wordWrap: 'on',
  wordWrapColumn: 80,
  wrappingIndent: 'indent',
  theme: 'workflows-subdued',
  padding: {
    top: 24,
    bottom: 16,
  },
  quickSuggestions: {
    other: true,
    comments: false,
    strings: true,
  },
  suggest: {
    snippetsPreventQuickSuggestions: false,
    showSnippets: true,
    filterGraceful: true, // Better filtering
    localityBonus: true, // Prioritize matches near cursor
  },
  wordBasedSuggestions: false,
  hover: {
    enabled: true,
    delay: 300,
    sticky: true,
    above: false, // Force hover below cursor to avoid clipping
  },
  formatOnType: true,
};

export interface WorkflowYAMLEditorProps {
  workflowId?: string;
  filename?: string;
  readOnly?: boolean;
  hasChanges?: boolean;
  lastUpdatedAt?: Date;
  highlightStep?: string;
  stepExecutions?: WorkflowStepExecutionDto[];
  'data-testid'?: string;
  highlightDiff?: boolean;
  value: string;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => void;
  onChange?: (value: string | undefined) => void;
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationResult[]>>;
  onSave?: (value: string) => void;
  esHost?: string;
  kibanaHost?: string;
  selectedExecutionId?: string;
  originalValue?: string;
  onStepActionClicked?: (params: { stepId: string; actionType: string }) => void;
}

export const WorkflowYAMLEditor = ({
  workflowId,
  filename = `${workflowId}.yaml`,
  readOnly = false,
  hasChanges = false,
  lastUpdatedAt,
  highlightStep,
  stepExecutions,
  highlightDiff = false,
  onMount,
  onChange,
  onSave,
  onValidationErrors,
  esHost = 'http://localhost:9200',
  kibanaHost,
  selectedExecutionId,
  originalValue,
  onStepActionClicked,
  ...props
}: WorkflowYAMLEditorProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { http, notifications },
  } = useKibana<CoreStart>();

  // Register the workflow YAML language (mostly theme) on first render
  // TODO: should we move this to a plugin setup?
  useEffect(() => {
    registerWorkflowYamlLanguage();
  }, []);

  // Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const stepExecutionsRef = useRef<WorkflowStepExecutionDto[] | undefined>(stepExecutions);

  // Refs / Keep stepExecutionsRef in sync
  useEffect(() => {
    stepExecutionsRef.current = stepExecutions;
  }, [stepExecutions]);

  // Refs / Disposables for Monaco providers
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  const dispatch = useDispatch();
  const focusedStepInfo = useSelector(selectFocusedStepInfo);
  const yamlDocument = useSelector(selectYamlDocument);
  const yamlDocumentRef = useRef<YAML.Document | null>(null);
  yamlDocumentRef.current = yamlDocument || null;

  const focusedStepInfoRef = useRef<StepInfo | undefined>(focusedStepInfo);
  focusedStepInfoRef.current = focusedStepInfo;

  // Data
  const { data: connectorsData } = useAvailableConnectors();

  // Styles
  const styles = useWorkflowEditorStyles();
  useMonacoWorkflowStyles();
  const [positionStyles, setPositionStyles] = useState<{ top: string; right: string } | null>(null);
  const { styles: stepOutlineStyles } = useFocusedStepOutline(editorRef.current);
  const { styles: stepExecutionStyles } = useStepDecorationsInExecution(editorRef.current);

  useWorkflowsMonacoTheme();
  useDynamicConnectorIcons(connectorsData);

  // Only show debug features in development
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Validation
  const workflowJsonSchemaStrict = useWorkflowJsonSchema({ loose: false });
  const schemas: SchemasSettings[] = useMemo(() => {
    return [
      {
        fileMatch: ['*'],
        // casting here because zod-to-json-schema returns a more complex type than JSONSchema7 expected by monaco-yaml
        schema: workflowJsonSchemaStrict as any,
        uri: WorkflowSchemaUri,
      },
    ];
  }, [workflowJsonSchemaStrict]);

  // TODO: move the schema generation up to detail page or some wrapper component
  const workflowYamlSchemaLoose = useMemo(() => {
    if (!connectorsData?.connectorTypes) {
      return getWorkflowZodSchemaLoose({});
    }
    return getWorkflowZodSchemaLoose(connectorsData.connectorTypes);
  }, [connectorsData?.connectorTypes]);

  const { error: errorValidating } = useYamlValidation(editorRef.current);

  const { validationErrors, handleMarkersChanged } = useHandleMarkersChanged({
    workflowYamlSchema: workflowYamlSchemaLoose,
    onValidationErrors,
  });

  const handleErrorClick = useCallback((error: YamlValidationResult) => {
    if (!editorRef.current) {
      return;
    }
    navigateToErrorPosition(editorRef.current, error.startLineNumber, error.startColumn);
  }, []);

  // Lifecycle
  const [isEditorMounted, setIsEditorMounted] = useState(false);

  useEffect(() => {
    if (!isEditorMounted) {
      return;
    }

    editorRef.current!.onDidScrollChange(() => {
      if (!focusedStepInfoRef.current) {
        return;
      }

      updateContainerPosition(focusedStepInfoRef.current, editorRef.current!);
    });
  }, [isEditorMounted]);

  const { registerKeyboardCommands, unregisterKeyboardCommands } = useRegisterKeyboardCommands();

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    registerKeyboardCommands({
      editor,
      openActionsPopover,
    });

    // Listen to content changes to detect typing
    const model = editor.getModel();
    if (model) {
      // Initial YAML parsing from main
      const value = model.getValue();
      if (value && value.trim() !== '') {
        // Use setTimeout to defer state updates until after the current render cycle
        // This prevents the flushSync warning while maintaining the correct order
        setTimeout(() => {
          dispatch(setYamlString(value));
          setIsEditorMounted(true);
        }, 0);
      } else {
        // If no content, just set the mounted state
        setTimeout(() => {
          setIsEditorMounted(true);
        }, 0);
      }
    } else {
      // If no model, just set the mounted state
      setTimeout(() => {
        setIsEditorMounted(true);
      }, 0);
    }

    // Setup Elasticsearch step providers if we have the required services
    if (http && notifications) {
      // Register Elasticsearch connector handler
      const elasticsearchHandler = new ElasticsearchMonacoConnectorHandler({
        http,
        notifications: notifications as any, // Temporary type cast
        // esHost,
        // kibanaHost || window.location.origin,
      });
      registerMonacoConnectorHandler(elasticsearchHandler);

      // Register Kibana connector handler
      const kibanaHandler = new KibanaMonacoConnectorHandler({
        http,
        notifications: notifications as any, // Temporary type cast
        kibanaHost: kibanaHost || window.location.origin,
      });
      registerMonacoConnectorHandler(kibanaHandler);

      const genericHandler = new GenericMonacoConnectorHandler();
      registerMonacoConnectorHandler(genericHandler);

      // Create unified providers
      const providerConfig = {
        getYamlDocument: () => yamlDocumentRef.current || null,
        options: {
          http,
          notifications: notifications as any,
          esHost,
          kibanaHost: kibanaHost || window.location.origin,
        },
      };

      // TODO: do not intercept 'setModelMarkers' twice
      // Intercept and modify markers at the source to fix connector validation messages
      // This prevents Monaco from ever seeing the problematic numeric enum messages
      const originalSetModelMarkers = monaco.editor.setModelMarkers;

      // Override Monaco's setModelMarkers function
      monaco.editor.setModelMarkers = getMonacoMarkerInterceptor(
        originalSetModelMarkers,
        workflowYamlSchemaLoose,
        yamlDocumentRef
      );

      // Store cleanup function to restore original behavior
      disposablesRef.current.push({
        dispose: () => {
          monaco.editor.setModelMarkers = originalSetModelMarkers;
        },
      });

      // Monaco YAML hover is now disabled via configuration (hover: false)
      // The unified hover provider will handle all hover content including validation errors

      // Register the unified hover provider for API documentation and other content
      const hoverDisposable = registerUnifiedHoverProvider(providerConfig);
      disposablesRef.current.push(hoverDisposable);
    }

    onMount?.(editor, monaco);
  };

  const handleEditorWillUnmount = () => {
    unregisterKeyboardCommands();
  };

  const changeSideEffects = useCallback(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();

      if (!model) {
        return;
      }
      dispatch(setYamlString(model.getValue()));
    }
  }, [dispatch]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (onChange) {
        onChange(value);
      }

      changeSideEffects();
    },
    [onChange, changeSideEffects]
  );

  useEffect(() => {
    // After editor is mounted or workflowId changes, validate the initial content
    if (isEditorMounted && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== '') {
        changeSideEffects();
      }
    }
  }, [changeSideEffects, isEditorMounted, workflowId]);

  // Clean up the monaco model and editor on unmount
  useEffect(() => {
    const editor = editorRef.current;
    return () => {
      // Dispose of Monaco providers
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];

      editor?.dispose();
    };
  }, []);

  // Track the last value we set internally to distinguish from external changes
  const lastInternalValueRef = useRef<string | undefined>(props.value);
  // Force refresh of decorations when props.value changes externally (e.g., switching executions)
  useEffect(() => {
    if (isEditorMounted && editorRef.current && props.value !== undefined) {
      // Check if this is an external change (not from our own typing)
      const isExternalChange = props.value !== lastInternalValueRef.current;

      if (isExternalChange) {
        // Check if Monaco editor content matches props.value
        const model = editorRef.current.getModel();
        if (model) {
          const currentContent = model.getValue();
          if (currentContent !== props.value) {
            // Wait a bit longer for Monaco to update its content, then force re-parse
            setTimeout(() => {
              changeSideEffects();
            }, 50); // Longer delay to ensure Monaco editor content is updated
          } else {
            // Content matches, just force re-parse to be safe
            setTimeout(() => {
              changeSideEffects();
            }, 10);
          }
        }

        // Update our tracking ref
        lastInternalValueRef.current = props.value;
      }
    }
  }, [props.value, isEditorMounted, changeSideEffects]);

  // Force decoration refresh specifically when switching to readonly mode (executions view)
  useEffect(() => {
    if (isEditorMounted) {
      // Small delay to ensure all state is settled
      setTimeout(() => {
        changeSideEffects();
      }, 50);
    }
  }, [isEditorMounted, changeSideEffects]);

  // Decorations
  useTriggerTypeDecorations({
    editor: editorRef.current,
    yamlDocument: yamlDocument || null,
    isEditorMounted,
  });

  useConnectorTypeDecorations({
    editor: editorRef.current,
    yamlDocument: yamlDocument || null,
    isEditorMounted,
  });

  useLineDifferencesDecorations({
    editor: editorRef.current,
    isEditorMounted,
    highlightDiff,
    originalValue,
    currentValue: props.value,
  });

  useAlertTriggerDecorations({
    editor: editorRef.current,
    yamlDocument: yamlDocument || null,
    isEditorMounted,
    readOnly,
  });

  const updateContainerPosition = (
    stepInfo: StepInfo,
    _editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    if (!_editor || !stepInfo) {
      return;
    }

    setPositionStyles({
      top: `${_editor.getTopForLineNumber(stepInfo.lineStart, true) - _editor.getScrollTop()}px`,
      right: '0px',
    });
  };

  useEffect(() => {
    if (!focusedStepInfo) {
      return;
    }
    updateContainerPosition(focusedStepInfo, editorRef.current!);
  }, [isEditorMounted, focusedStepInfo, setPositionStyles]);

  useEffect(() => {
    dispatch(setStepExecutions({ stepExecutions }));
  }, [stepExecutions, dispatch]);

  useEffect(() => {
    if (!isEditorMounted) {
      return;
    }

    const disposable = editorRef.current!.onDidChangeCursorPosition((event) => {
      dispatch(setCursorPosition({ lineNumber: event.position.lineNumber }));
    });

    return () => disposable.dispose();
  }, [isEditorMounted, dispatch]);

  // Actions
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState(false);
  const openActionsPopover = () => {
    setActionsPopoverOpen(true);
  };
  const closeActionsPopover = () => {
    setActionsPopoverOpen(false);
  };
  const onActionSelected = (action: ActionOptionData) => {
    const model = editorRef.current?.getModel();
    const yamlDocumentCurrent = yamlDocumentRef.current;
    const cursorPosition = editorRef.current?.getPosition();
    const editor = editorRef.current;
    if (!model || !yamlDocumentCurrent || !editor) {
      return;
    }
    if (isTriggerType(action.id)) {
      insertTriggerSnippet(model, yamlDocumentCurrent, action.id, editor);
    } else {
      insertStepSnippet(model, yamlDocumentCurrent, action.id, cursorPosition, editor);
    }
    closeActionsPopover();
  };

  const completionProvider = useMemo(() => {
    return getCompletionItemProvider(workflowYamlSchemaLoose, connectorsData?.connectorTypes);
  }, [workflowYamlSchemaLoose, connectorsData?.connectorTypes]);

  useEffect(() => {
    // Monkey patching to set the initial markers
    // https://github.com/suren-atoyan/monaco-react/issues/70#issuecomment-760389748
    const setModelMarkers = monaco.editor.setModelMarkers;
    monaco.editor.setModelMarkers = function (model, owner, markers) {
      setModelMarkers.call(monaco.editor, model, owner, markers);
      if (editorRef.current) {
        handleMarkersChanged(editorRef.current, model.uri, markers, owner);
      }
    };

    return () => {
      // Reset the monaco.editor.setModelMarkers to the original function
      monaco.editor.setModelMarkers = setModelMarkers;
    };
  }, [handleMarkersChanged]);

  // Debug
  const downloadSchema = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(workflowJsonSchemaStrict, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'workflow-schema.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      // to download schema:', error);
      notifications?.toasts.addError(error as Error, {
        title: 'Failed to download schema',
      });
    }
  }, [workflowJsonSchemaStrict, notifications]);

  return (
    <div css={css([styles.container, stepOutlineStyles, stepExecutionStyles])} ref={containerRef}>
      <ActionsMenuPopover
        anchorPosition="upCenter"
        offset={32}
        button={<EuiButton iconType="plusInCircle" css={{ display: 'none' }} />}
        container={containerRef.current ?? undefined}
        closePopover={closeActionsPopover}
        onActionSelected={onActionSelected}
        isOpen={actionsPopoverOpen}
        panelProps={{ css: styles.actionsMenuPopoverPanel }}
      />
      <UnsavedChangesPrompt hasUnsavedChanges={hasChanges} shouldPromptOnNavigation={true} />
      {/* Floating Elasticsearch step actions */}
      <div css={styles.stepActionsContainer} style={positionStyles ? positionStyles : {}}>
        <StepActions onStepActionClicked={onStepActionClicked} />
      </div>
      {isDevelopment && (
        <div
          css={{ position: 'absolute', top: euiTheme.size.xxs, right: euiTheme.size.m, zIndex: 10 }}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {/* Debug: Download Schema Button - Only show in development */}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                css={styles.downloadSchemaButton}
                iconType="download"
                size="xs"
                aria-label="Download JSON schema for debugging"
                onClick={downloadSchema}
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.currentTarget.click();
                  }
                }}
              >
                Schema
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      )}
      <div css={styles.editorContainer}>
        <YamlEditor
          editorDidMount={handleEditorDidMount}
          editorWillUnmount={handleEditorWillUnmount}
          onChange={handleChange}
          options={{ ...editorOptions, readOnly }}
          schemas={schemas}
          suggestionProvider={completionProvider}
          {...props}
        />
      </div>
      <div css={styles.validationErrorsContainer}>
        <WorkflowYAMLValidationErrors
          isMounted={isEditorMounted}
          error={errorValidating}
          validationErrors={validationErrors}
          onErrorClick={handleErrorClick}
          rightSide={<WorkflowYAMLEditorShortcuts />}
        />
      </div>
    </div>
  );
};
