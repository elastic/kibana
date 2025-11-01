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
import type { SchemasSettings } from 'monaco-yaml';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import YAML from 'yaml';
import { FormattedMessage } from '@kbn/i18n-react';
import { monaco } from '@kbn/monaco';
import { isTriggerType } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import type { z } from '@kbn/zod';
import {
  useAlertTriggerDecorations,
  useConnectorTypeDecorations,
  useFocusedStepOutline,
  useLineDifferencesDecorations,
  useStepDecorationsInExecution,
  useTriggerTypeDecorations,
} from './decorations';
import { useCompletionProvider } from './hooks/use_completion_provider';
import { StepActions } from './step_actions';
import { WorkflowYAMLEditorShortcuts } from './workflow_yaml_editor_shortcuts';
import { WorkflowYAMLValidationErrors } from './workflow_yaml_validation_errors';
import { addDynamicConnectorsToCache } from '../../../../common/schema';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';
import { useSaveYaml } from '../../../entities/workflows/model/use_save_yaml';
import { ActionsMenuPopover } from '../../../features/actions_menu_popover';
import type { ActionOptionData } from '../../../features/actions_menu_popover/types';
import { useMonacoMarkersChangedInterceptor } from '../../../features/validate_workflow_yaml/lib/use_monaco_markers_changed_interceptor';
import { useYamlValidation } from '../../../features/validate_workflow_yaml/lib/use_yaml_validation';
import type { YamlValidationResult } from '../../../features/validate_workflow_yaml/model/types';
import { useWorkflowJsonSchema } from '../../../features/validate_workflow_yaml/model/use_workflow_json_schema';
import { useKibana } from '../../../hooks/use_kibana';
import { UnsavedChangesPrompt } from '../../../shared/ui/unsaved_changes_prompt';
import { YamlEditor } from '../../../shared/ui/yaml_editor';
import {
  ElasticsearchMonacoConnectorHandler,
  GenericMonacoConnectorHandler,
  KibanaMonacoConnectorHandler,
} from '../lib/monaco_connectors';
import {
  registerMonacoConnectorHandler,
  registerUnifiedHoverProvider,
} from '../lib/monaco_providers';
import { insertStepSnippet } from '../lib/snippets/insert_step_snippet';
import { insertTriggerSnippet } from '../lib/snippets/insert_trigger_snippet';
import type { StepInfo } from '../lib/store';
import {
  selectFocusedStepInfo,
  selectSchemaLoose,
  selectYamlDocument,
  setCursorPosition,
  setStepExecutions,
  setYamlString,
} from '../lib/store';
import { selectHasChanges, selectWorkflow } from '../lib/store/selectors';
import { setIsTestModalOpen } from '../lib/store/slice';
import { useRegisterKeyboardCommands } from '../lib/use_register_keyboard_commands';
import { navigateToErrorPosition } from '../lib/utils';
import { GlobalWorkflowEditorStyles } from '../styles/global_workflow_editor_styles';
import { useDynamicTypeIcons } from '../styles/use_dynamic_type_icons';
import { useWorkflowEditorStyles } from '../styles/use_workflow_editor_styles';
import { useWorkflowsMonacoTheme } from '../styles/use_workflows_monaco_theme';

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
  suggestLineHeight: 25, // default 21 + 4px for padding
};

export interface WorkflowYAMLEditorProps {
  workflowYaml: string;
  isExecutionYaml?: boolean;
  stepExecutions?: WorkflowStepExecutionDto[];
  'data-testid'?: string;
  highlightDiff?: boolean;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => void;
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationResult[]>>;
  esHost?: string;
  kibanaHost?: string;
  selectedExecutionId?: string;
  onStepActionClicked?: (params: { stepId: string; actionType: string }) => void;
}

export const WorkflowYAMLEditor = ({
  workflowYaml,
  isExecutionYaml = false,
  stepExecutions,
  highlightDiff = false,
  onMount,
  onValidationErrors,
  esHost = 'http://localhost:9200',
  kibanaHost,
  selectedExecutionId,
  onStepActionClicked,
  ...props
}: WorkflowYAMLEditorProps) => {
  const { euiTheme } = useEuiTheme();
  const { http, notifications } = useKibana().services;

  const dispatch = useDispatch();

  const hasChanges = useSelector(selectHasChanges);
  const workflow = useSelector(selectWorkflow);

  const originalValue = workflow?.yaml ?? '';
  const workflowId = workflow?.id ?? '';

  const saveYaml = useSaveYaml();

  const onChange = useCallback(
    (yaml: string) => {
      dispatch(setYamlString(yaml));
    },
    [dispatch]
  );

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
  const focusedStepInfo = useSelector(selectFocusedStepInfo);
  const workflowYamlSchemaLoose = useSelector(selectSchemaLoose);
  // The current yaml document in the editor (could be unsaved)
  const currentYamlDocument = useSelector(selectYamlDocument);

  const yamlDocument = useMemo(() => {
    // if the yaml comes from an execution, we need to parse it to get the correct yaml document
    if (isExecutionYaml) {
      return YAML.parseDocument(workflowYaml, { keepSourceTokens: true });
    }
    return currentYamlDocument;
  }, [isExecutionYaml, workflowYaml, currentYamlDocument]);

  const yamlDocumentRef = useRef<YAML.Document | null>(yamlDocument ?? null);
  yamlDocumentRef.current = yamlDocument || null;

  const focusedStepInfoRef = useRef<StepInfo | undefined>(focusedStepInfo);
  focusedStepInfoRef.current = focusedStepInfo;

  // Data
  const connectorsData = useAvailableConnectors();

  useEffect(() => {
    if (connectorsData?.connectorTypes) {
      addDynamicConnectorsToCache(connectorsData.connectorTypes);
    }
  }, [connectorsData?.connectorTypes]);

  // Styles
  const styles = useWorkflowEditorStyles();
  const [positionStyles, setPositionStyles] = useState<{ top: string; right: string } | null>(null);
  const { styles: stepOutlineStyles } = useFocusedStepOutline(editorRef.current);
  const { styles: stepExecutionStyles } = useStepDecorationsInExecution(editorRef.current);

  useWorkflowsMonacoTheme();
  useDynamicTypeIcons(connectorsData);

  // Only show debug features in development
  const isDevelopment = process.env.NODE_ENV !== 'production';

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
      workflowYamlSchema: workflowYamlSchemaLoose as z.ZodSchema,
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

  // handlers for the keyboard commands, passed only the first time the component is mounted
  // they should not have any dependencies, so they are not affected by the changes in the component
  const keyboardHandlers = useMemo(
    () => ({
      save: () => saveYaml(),
      run: () => dispatch(setIsTestModalOpen(true)),
      saveAndRun: () => saveYaml().then(() => dispatch(setIsTestModalOpen(true))),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      registerKeyboardCommands({
        editor,
        openActionsPopover,
        ...keyboardHandlers,
      });

      // Listen to content changes to detect typing
      const model = editor.getModel();
      if (!model) {
        return;
      }
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
          notifications,
        });
        registerMonacoConnectorHandler(elasticsearchHandler);

        // Register Kibana connector handler
        const kibanaHandler = new KibanaMonacoConnectorHandler({
          http,
          notifications,
          kibanaHost: kibanaHost || window.location.origin,
        });
        registerMonacoConnectorHandler(kibanaHandler);

        // Monaco YAML hover is now disabled via configuration (hover: false)
        // The unified hover provider will handle all hover content including validation errors

        const genericHandler = new GenericMonacoConnectorHandler();
        registerMonacoConnectorHandler(genericHandler);

        // Create unified providers
        const providerConfig = {
          getYamlDocument: () => yamlDocumentRef.current || null,
          options: {
            http,
            notifications,
            esHost,
            kibanaHost: kibanaHost || window.location.origin,
          },
        };

        // Register the unified hover provider for API documentation and other content
        const hoverDisposable = registerUnifiedHoverProvider(providerConfig);
        disposablesRef.current.push(hoverDisposable);
      }

      onMount?.(editor, monaco);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleEditorWillUnmount = useCallback(() => {
    unregisterKeyboardCommands();
  }, [unregisterKeyboardCommands]);

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
    (value: string) => {
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
      if (!model || !yamlDocumentCurrent || !editor) {
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

  const completionProvider = useCompletionProvider();

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
    <div css={css([styles.container, stepOutlineStyles, stepExecutionStyles])} ref={containerRef}>
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
                <FormattedMessage
                  id="workflows.yamlEditor.downloadSchemaButtonLabel"
                  defaultMessage="JSON Schema"
                />
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
          options={options}
          schemas={schemas}
          suggestionProvider={completionProvider}
          value={workflowYaml}
          {...props}
        />
      </div>
      <div css={styles.validationErrorsContainer}>
        <WorkflowYAMLValidationErrors
          isMounted={isEditorMounted}
          isLoading={isLoadingValidation}
          error={errorValidating}
          validationErrors={validationErrors}
          onErrorClick={handleErrorClick}
          rightSide={<WorkflowYAMLEditorShortcuts onOpenActionsMenu={setActionsPopoverOpen} />}
        />
      </div>
    </div>
  );
};
