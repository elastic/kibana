/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import classnames from 'classnames';
import type { SchemasSettings } from 'monaco-yaml';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type YAML from 'yaml';
import { FormattedMessage } from '@kbn/i18n-react';
import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import { isTriggerType } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import type { z } from '@kbn/zod/v4';
import { ActionsMenuButton } from './actions_menu_button';
import {
  useAlertTriggerDecorations,
  useConnectorTypeDecorations,
  useFocusedStepDecoration,
  useLineDifferencesDecorations,
  useStepDecorationsInExecution,
  useTriggerTypeDecorations,
} from './decorations';
import { useWorkflowYamlCompletionProvider } from './hooks/use_workflow_yaml_completion_provider';
import { StepActions } from './step_actions';
import { WorkflowYamlValidationAccordion } from './workflow_yaml_validation_accordion';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';
import { useSaveYaml } from '../../../entities/workflows/model/use_save_yaml';
import type { StepInfo } from '../../../entities/workflows/store';
import {
  selectEditorFocusedStepInfo,
  selectEditorYamlDocument,
  selectSchema,
  setCursorPosition,
  setIsYamlSynced,
  setYamlString,
} from '../../../entities/workflows/store';
import {
  selectEditorYaml,
  selectExecution,
  selectHasChanges,
  selectIsExecutionsTab,
  selectIsSavingYaml,
  selectStepExecutions,
  selectWorkflow,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { setIsTestModalOpen } from '../../../entities/workflows/store/workflow_detail/slice';
import { ActionsMenuPopover } from '../../../features/actions_menu_popover';
import type { ActionOptionData } from '../../../features/actions_menu_popover/types';
import { useMonacoMarkersChangedInterceptor } from '../../../features/validate_workflow_yaml/lib/use_monaco_markers_changed_interceptor';
import { useYamlValidation } from '../../../features/validate_workflow_yaml/lib/use_yaml_validation';
import type { YamlValidationResult } from '../../../features/validate_workflow_yaml/model/types';
import { useWorkflowJsonSchema } from '../../../features/validate_workflow_yaml/model/use_workflow_json_schema';
import { useKibana } from '../../../hooks/use_kibana';
import { UnsavedChangesPrompt, YamlEditor } from '../../../shared/ui';
import { interceptMonacoYamlProvider } from '../lib/autocomplete/intercept_monaco_yaml_provider';
import { buildExecutionContext } from '../lib/execution_context/build_execution_context';
import type { ExecutionContext } from '../lib/execution_context/build_execution_context';
import { interceptMonacoYamlHoverProvider } from '../lib/hover/intercept_monaco_yaml_hover_provider';
import {
  ElasticsearchMonacoConnectorHandler,
  GenericMonacoConnectorHandler,
  KibanaMonacoConnectorHandler,
} from '../lib/monaco_connectors';
import { CustomMonacoStepHandler } from '../lib/monaco_connectors/custom_monaco_step_handler';
import {
  registerMonacoConnectorHandler,
  registerUnifiedHoverProvider,
} from '../lib/monaco_providers';
import { insertStepSnippet } from '../lib/snippets/insert_step_snippet';
import { insertTriggerSnippet } from '../lib/snippets/insert_trigger_snippet';
import { useRegisterHoverCommands } from '../lib/use_register_hover_commands';
import { useRegisterKeyboardCommands } from '../lib/use_register_keyboard_commands';
import { navigateToErrorPosition } from '../lib/utils';
import { GlobalWorkflowEditorStyles } from '../styles/global_workflow_editor_styles';
import { useDynamicTypeIcons } from '../styles/use_dynamic_type_icons';
import {
  EXECUTION_YAML_SNAPSHOT_CLASS,
  useWorkflowEditorStyles,
} from '../styles/use_workflow_editor_styles';
import {
  useWorkflowsMonacoTheme,
  WORKFLOWS_MONACO_EDITOR_THEME,
} from '../styles/use_workflows_monaco_theme';

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
  lineHeight: 23, // default ~21px + 2px
  renderWhitespace: 'none',
  wordWrap: 'on',
  wordWrapColumn: 80,
  wrappingIndent: 'indent',
  theme: WORKFLOWS_MONACO_EDITOR_THEME,
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
  suggestLineHeight: 25, // default 21 + 4px for padding
};

export interface WorkflowYAMLEditorProps {
  highlightDiff?: boolean;
  onStepRun: (params: { stepId: string; actionType: string }) => void;
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
}

export const WorkflowYAMLEditor = ({
  highlightDiff = false,
  onStepRun,
  editorRef: parentEditorRef,
}: WorkflowYAMLEditorProps) => {
  const { euiTheme } = useEuiTheme();
  const { notifications, http } = useKibana().services;

  const saveYaml = useSaveYaml();
  const isSaving = useSelector(selectIsSavingYaml);
  const dispatch = useDispatch();
  const onChange = useCallback(
    (yaml: string) => {
      dispatch(setYamlString(yaml));
    },
    [dispatch]
  );

  const onSyncStateChange = useCallback(
    (isSynced: boolean) => {
      dispatch(setIsYamlSynced(isSynced));
    },
    [dispatch]
  );

  const workflowYaml = useSelector(selectEditorYaml) ?? '';
  const isExecutionYaml = useSelector(selectIsExecutionsTab);
  const hasChanges = useSelector(selectHasChanges);
  const workflow = useSelector(selectWorkflow);

  const originalValue = workflow?.yaml ?? '';

  // Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const stepExecutions = useSelector(selectStepExecutions);
  const stepExecutionsRef = useRef<WorkflowStepExecutionDto[] | undefined>(stepExecutions);
  stepExecutionsRef.current = stepExecutions;

  const execution = useSelector(selectExecution);
  const executionContextRef = useRef<ExecutionContext | null>(null);

  // Build execution context when step executions are available
  useEffect(() => {
    if (isExecutionYaml && stepExecutions) {
      executionContextRef.current = buildExecutionContext(stepExecutions, execution?.context);
    } else {
      executionContextRef.current = null;
    }
  }, [isExecutionYaml, stepExecutions, execution?.context]);

  // Ref to track saving state for keyboard handlers
  const isSavingRef = useRef<boolean>(false);
  isSavingRef.current = isSaving;

  // Refs / Disposables for Monaco providers
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  const workflowYamlSchema = useSelector(selectSchema);
  // The current yaml document in the editor (could be unsaved)
  const yamlDocument = useSelector(selectEditorYamlDocument);
  const yamlDocumentRef = useRef<YAML.Document | null>(yamlDocument ?? null);
  yamlDocumentRef.current = yamlDocument || null;

  const focusedStepInfo = useSelector(selectEditorFocusedStepInfo);
  const focusedStepInfoRef = useRef<StepInfo | undefined>(focusedStepInfo);
  focusedStepInfoRef.current = focusedStepInfo;

  // Data
  const connectorsData = useAvailableConnectors();

  // Styles
  const styles = useWorkflowEditorStyles();
  const [positionStyles, setPositionStyles] = useState<{ top: string; right: string } | null>(null);
  const { styles: stepExecutionStyles } = useStepDecorationsInExecution(editorRef.current);

  useWorkflowsMonacoTheme();
  useDynamicTypeIcons(connectorsData);

  // Only show debug features in development
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Initialize monkey-patch to intercept monaco-yaml's provider BEFORE it loads
  useEffect(() => {
    interceptMonacoYamlProvider();
    interceptMonacoYamlHoverProvider();
  }, []);

  // Validation
  const { jsonSchema: workflowJsonSchemaStrict, uri: workflowSchemaUriStrict } =
    useWorkflowJsonSchema({ loose: false });
  const schemas: SchemasSettings[] = useMemo(() => {
    if (!workflowSchemaUriStrict || !workflowJsonSchemaStrict) {
      return [];
    }
    return [
      {
        fileMatch: ['*'],
        // casting here because zod-to-json-schema returns a more complex type than JSONSchema7 expected by monaco-yaml
        schema: workflowJsonSchemaStrict as SchemasSettings['schema'],
        uri: workflowSchemaUriStrict,
      },
    ];
  }, [workflowJsonSchemaStrict, workflowSchemaUriStrict]);

  const { error: errorValidating, isLoading: isLoadingValidation } = useYamlValidation(
    editorRef.current
  );

  const { validationErrors, transformMonacoMarkers, handleMarkersChanged } =
    useMonacoMarkersChangedInterceptor({
      yamlDocumentRef,
      workflowYamlSchema: workflowYamlSchema as z.ZodSchema,
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
  const { registerHoverCommands, unregisterHoverCommands } = useRegisterHoverCommands();

  // handlers for the keyboard commands, passed only the first time the component is mounted
  // they should not have any dependencies, so they are not affected by the changes in the component
  const keyboardHandlers = useMemo(
    () => ({
      save: () => {
        if (isSavingRef.current) {
          return;
        }
        saveYaml();
      },
      run: () => dispatch(setIsTestModalOpen(true)),
      saveAndRun: () => {
        if (isSavingRef.current) {
          return;
        }
        saveYaml().then(() => dispatch(setIsTestModalOpen(true)));
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const completionProvider = useWorkflowYamlCompletionProvider();

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      // Sync with parent ref
      parentEditorRef.current = editor;

      registerKeyboardCommands({ editor, openActionsPopover, ...keyboardHandlers });
      registerHoverCommands();

      if (completionProvider) {
        const disposable = monaco.languages.registerCompletionItemProvider(
          YAML_LANG_ID,
          completionProvider
        );
        disposablesRef.current.push(disposable);
      }

      // Listen to content changes to detect typing
      const model = editor.getModel();
      if (!model) {
        return;
      }
      // If no model, just set the mounted state
      setTimeout(() => {
        setIsEditorMounted(true);
      }, 0);

      // Setup Elasticsearch step providers if we have the required services
      if (http && notifications) {
        // Register Elasticsearch connector handler
        const elasticsearchHandler = new ElasticsearchMonacoConnectorHandler({
          http,
          notifications,
        });
        registerMonacoConnectorHandler(elasticsearchHandler);

        // Register Kibana connector handler
        const kibanaHandler = new KibanaMonacoConnectorHandler({
          http,
          notifications,
          kibanaHost: window.location.origin,
        });
        registerMonacoConnectorHandler(kibanaHandler);

        const customHandler = new CustomMonacoStepHandler();
        registerMonacoConnectorHandler(customHandler);

        const genericHandler = new GenericMonacoConnectorHandler();
        registerMonacoConnectorHandler(genericHandler);

        // Create unified providers with template expression support
        const providerConfig = {
          getYamlDocument: () => yamlDocumentRef.current || null,
          getExecutionContext: () => executionContextRef.current,
          options: {
            http,
            notifications,
            esHost: 'http://localhost:9200',
            kibanaHost: window.location.origin,
          },
        };

        // Register the unified hover provider for API documentation and template expressions
        const hoverDisposable = registerUnifiedHoverProvider(providerConfig);
        disposablesRef.current.push(hoverDisposable);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleEditorWillUnmount = useCallback(() => {
    unregisterKeyboardCommands();
    unregisterHoverCommands();
  }, [unregisterKeyboardCommands, unregisterHoverCommands]);

  // Clean up the monaco model and editor on unmount
  useEffect(() => {
    return () => {
      // Dispose of Monaco providers
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];

      // Clear parent ref
      parentEditorRef.current = null;
      editorRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusedStepDecoration(editorRef.current);

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
    currentValue: workflowYaml,
  });

  useAlertTriggerDecorations({
    editor: editorRef.current,
    yamlDocument: yamlDocument || null,
    isEditorMounted,
    readOnly: isExecutionYaml,
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
  }, [isEditorMounted, focusedStepInfo]);

  useEffect(() => {
    if (!isEditorMounted) {
      return;
    }

    const disposable = editorRef.current!.onDidChangeCursorPosition((event) => {
      dispatch(
        setCursorPosition({
          lineNumber: event.position.lineNumber,
          column: event.position.column,
        })
      );
    });

    return () => disposable.dispose();
  }, [isEditorMounted, dispatch]);

  // Actions
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState(false);
  const openActionsPopover = useCallback(() => {
    setActionsPopoverOpen(true);
  }, []);
  const closeActionsPopover = useCallback(() => {
    setActionsPopoverOpen(false);
  }, []);
  const onActionSelected = useCallback(
    (action: ActionOptionData) => {
      const model = editorRef.current?.getModel();
      const yamlDocumentCurrent = yamlDocumentRef.current;
      const cursorPosition = editorRef.current?.getPosition();
      const editor = editorRef.current;
      if (!model || !editor) {
        return;
      }
      if (isTriggerType(action.id)) {
        insertTriggerSnippet(model, yamlDocumentCurrent, action.id, editor);
      } else {
        insertStepSnippet(model, yamlDocumentCurrent, action.id, cursorPosition, editor);
      }
      closeActionsPopover();
    },
    [closeActionsPopover]
  );

  const options = useMemo(() => {
    return { ...editorOptions, readOnly: isExecutionYaml };
  }, [isExecutionYaml]);

  useEffect(() => {
    // Monkey patching
    // 1. to set the initial markers https://github.com/suren-atoyan/monaco-react/issues/70#issuecomment-760389748
    // 2. to intercept and format markers validation messages – this prevents Monaco from ever seeing the problematic numeric enum messages
    const setModelMarkers = monaco.editor.setModelMarkers;
    monaco.editor.setModelMarkers = function (model, owner, markers) {
      // as we intercepted the setModelMarkers method, we need to check if the call is from the current editor to avoid setting markers which could come from other editors
      const editorUri = editorRef.current?.getModel()?.uri;
      if (model.uri.path !== editorUri?.path) {
        // skip setting markers for other editors
        setModelMarkers.call(monaco.editor, model, owner, markers);
        return;
      }
      const transformedMarkers = transformMonacoMarkers(model, owner, markers);
      setModelMarkers.call(monaco.editor, model, owner, transformedMarkers);
      handleMarkersChanged(model, owner, transformedMarkers);
    };

    return () => {
      // Reset the monaco.editor.setModelMarkers to the original function
      monaco.editor.setModelMarkers = setModelMarkers;
    };
  }, [handleMarkersChanged, transformMonacoMarkers]);

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
    <div css={css([styles.container, stepExecutionStyles])} ref={containerRef}>
      <GlobalWorkflowEditorStyles />
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
        <StepActions onStepActionClicked={onStepRun} />
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
                iconType={workflowJsonSchemaStrict === null ? 'warning' : 'download'}
                size="xs"
                aria-label="Download JSON schema for debugging"
                onClick={downloadSchema}
                tabIndex={0}
                disabled={workflowJsonSchemaStrict === null}
                onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.currentTarget.click();
                  }
                }}
              >
                <FormattedMessage
                  id="workflows.yamlEditor.downloadSchemaButtonLabel"
                  defaultMessage="JSON Schema"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      )}
      <div
        css={styles.editorContainer}
        className={classnames({ [EXECUTION_YAML_SNAPSHOT_CLASS]: isExecutionYaml })}
      >
        <YamlEditor
          editorDidMount={handleEditorDidMount}
          editorWillUnmount={handleEditorWillUnmount}
          onChange={onChange}
          onSyncStateChange={onSyncStateChange}
          options={options}
          schemas={schemas}
          value={workflowYaml}
          enableFindAction={true}
          dataTestSubj="workflowYamlEditor"
        />
      </div>
      <div css={styles.validationErrorsContainer}>
        <WorkflowYamlValidationAccordion
          isMounted={isEditorMounted}
          isLoading={isLoadingValidation}
          error={errorValidating}
          validationErrors={validationErrors}
          onErrorClick={handleErrorClick}
          extraAction={
            // Only show the shortcuts in edit mode
            !isExecutionYaml ? <ActionsMenuButton onClick={openActionsPopover} /> : null
          }
        />
      </div>
    </div>
  );
};
