/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiButton, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { isTriggerType } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import type { SchemasSettings } from 'monaco-yaml';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type YAML from 'yaml';
import { type Pair, type Scalar, isPair, isScalar } from 'yaml';
import { useDispatch, useSelector } from 'react-redux';
import { useHandleMarkersChanged } from '../../../features/validate_workflow_yaml/lib/use_handle_markers_changed';
import { getWorkflowZodSchemaLoose } from '../../../../common/schema';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';
import {
  getStepNodesWithType,
  getTriggerNodes,
  getTriggerNodesWithType,
} from '../../../../common/lib/yaml_utils';
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
import { getMonacoRangeFromYamlNode, navigateToErrorPosition } from '../lib/utils';
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
import { useFocusedStepOutline, useStepDecorationsInExecution } from '../lib/hooks';
import { useWorkflowJsonSchema } from '../../../features/validate_workflow_yaml/model/use_workflow_json_schema';
import { useWorkflowsMonacoTheme } from './use_workflows_monaco_theme';
import { useWorkflowEditorStyles } from '../styles/use_workflow_editor_styles';
import { useMonacoWorkflowStyles } from '../styles/use_monaco_workflow_styles';
import { registerWorkflowYamlLanguage } from '../monaco/workflow_yaml';
import { useDynamicConnectorIcons } from './use_dynamic_connector_icons';
import { getMonacoMarkerInterceptor } from '../lib/get_monaco_marker_interceptor';

const WorkflowSchemaUri = 'file:///workflow-schema.json';

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

  // Register the workflow YAML language on first render
  useEffect(() => {
    registerWorkflowYamlLanguage();
  }, []);

  // Use the new styling hooks
  const styles = useWorkflowEditorStyles();
  useMonacoWorkflowStyles();
  const [positionStyles, setPositionStyles] = useState<{ top: string; right: string } | null>(null);
  // Only show debug features in development
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const { data: connectorsData } = useAvailableConnectors();

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

  const stepExecutionsRef = useRef<WorkflowStepExecutionDto[] | undefined>(stepExecutions);

  // Keep stepExecutionsRef in sync
  useEffect(() => {
    stepExecutionsRef.current = stepExecutions;
  }, [stepExecutions]);

  // REMOVED: highlightStepDecorationCollectionRef - now handled by UnifiedActionsProvider
  const alertTriggerDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const triggerTypeDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const connectorTypeDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const connectorIdShadowDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const unifiedProvidersRef = useRef<{
    hover: any;
    actions: any;
    stepExecution: any;
  } | null>(null);

  // Disposables for Monaco providers
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  const dispatch = useDispatch();
  const focusedStepInfo = useSelector(selectFocusedStepInfo);
  const yamlDocument = useSelector(selectYamlDocument);
  const yamlDocumentRef = useRef<YAML.Document | null>(null);
  yamlDocumentRef.current = yamlDocument || null;

  const focusedStepInfoRef = useRef<StepInfo | undefined>(focusedStepInfo);
  focusedStepInfoRef.current = focusedStepInfo;

  const { styles: stepOutlineStyles } = useFocusedStepOutline(editorRef.current);
  const { styles: stepExecutionStyles } = useStepDecorationsInExecution(editorRef.current);

  // Memoize the schema to avoid re-generating it on every render
  const workflowYamlSchemaLoose = useMemo(() => {
    if (!connectorsData?.connectorTypes) {
      // TODO: remove this once we move the schema generation up to detail page or some wrapper component
      return getWorkflowZodSchemaLoose({});
    }
    return getWorkflowZodSchemaLoose(connectorsData.connectorTypes);
  }, [connectorsData?.connectorTypes]);

  const changesHighlightDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const { error: errorValidating } = useYamlValidation(editorRef.current);

  const { validationErrors, handleMarkersChanged } = useHandleMarkersChanged({
    workflowYamlSchema: workflowYamlSchemaLoose,
    onValidationErrors,
  });

  const [isEditorMounted, setIsEditorMounted] = useState(false);

  // Helper to compute diff lines
  // TODO: use builtin monaco diff editor
  const calculateLineDifferences = useCallback((original: string, current: string) => {
    const originalLines = (original ?? '').split('\n');
    const currentLines = (current ?? '').split('\n');
    const changed: number[] = [];
    const max = Math.max(originalLines.length, currentLines.length);
    for (let i = 0; i < max; i++) {
      if ((originalLines[i] ?? '') !== (currentLines[i] ?? '')) changed.push(i + 1);
    }
    return changed;
  }, []);

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
    if (!isEditorMounted) {
      return;
    }

    editorRef.current!.onDidScrollChange(() => {
      if (!focusedStepInfoRef.current) {
        return;
      }

      updateContainerPosition(focusedStepInfoRef.current, editorRef.current!);
    });
  }, [isEditorMounted, setPositionStyles]);

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

  // Apply diff highlight when toggled
  useEffect(() => {
    if (!highlightDiff || !originalValue || !editorRef.current || !isEditorMounted) {
      if (changesHighlightDecorationCollectionRef.current) {
        changesHighlightDecorationCollectionRef.current.clear();
      }
      return;
    }
    const model = editorRef.current.getModel();
    if (!model) return;
    if (changesHighlightDecorationCollectionRef.current) {
      changesHighlightDecorationCollectionRef.current.clear();
    }
    const changedLines = calculateLineDifferences(originalValue, props.value ?? '');
    if (changedLines.length === 0) return;
    const decorations = changedLines.map((lineNumber) => ({
      range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
      options: {
        className: 'changed-line-highlight',
        isWholeLine: true,
        marginClassName: 'changed-line-margin',
      },
    }));
    changesHighlightDecorationCollectionRef.current =
      editorRef.current.createDecorationsCollection(decorations);
    return () => {
      changesHighlightDecorationCollectionRef.current?.clear();
    };
  }, [highlightDiff, originalValue, isEditorMounted, props.value, calculateLineDifferences]);

  // Add a ref to track if the last change was just typing
  const lastChangeWasTypingRef = useRef(false);

  // Track the last value we set internally to distinguish from external changes
  const lastInternalValueRef = useRef<string | undefined>(props.value);

  // Helper function to clear all decorations
  const clearAllDecorations = useCallback(() => {
    if (alertTriggerDecorationCollectionRef.current) {
      alertTriggerDecorationCollectionRef.current.clear();
    }
    if (triggerTypeDecorationCollectionRef.current) {
      triggerTypeDecorationCollectionRef.current.clear();
    }
    if (connectorTypeDecorationCollectionRef.current) {
      connectorTypeDecorationCollectionRef.current.clear();
    }

    if (connectorIdShadowDecorationCollectionRef.current) {
      connectorIdShadowDecorationCollectionRef.current.clear();
    }

    // Also clear step execution decorations
    if (unifiedProvidersRef.current?.stepExecution) {
      unifiedProvidersRef.current.stepExecution.dispose();
      unifiedProvidersRef.current.stepExecution = null;
    }
    // Clear unified actions provider highlighting
    if (unifiedProvidersRef.current?.actions) {
      // The actions provider will clear its own decorations on next update
    }
  }, []);

  // ... existing code ...

  const changeSideEffects = useCallback(
    (isTypingChange = false) => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();

        if (!model) {
          return;
        }
        dispatch(setYamlString(model.getValue()));
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (yamlDocument) {
      return;
    }
    clearAllDecorations();
  }, [yamlDocument, clearAllDecorations]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      // Track this as an internal change BEFORE calling onChange
      lastInternalValueRef.current = value;

      if (onChange) {
        onChange(value);
      }

      // Pass the typing flag to changeSideEffects
      changeSideEffects(lastChangeWasTypingRef.current);
      // Reset the flag
      lastChangeWasTypingRef.current = false;
    },
    [onChange, changeSideEffects]
  );

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

  const { registerKeyboardCommands, unregisterKeyboardCommands } = useRegisterKeyboardCommands();

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    editor.updateOptions({
      glyphMargin: true,
    });

    registerKeyboardCommands({
      editor,
      openActionsPopover,
    });

    // Listen to content changes to detect typing
    const model = editor.getModel();
    if (model) {
      model.onDidChangeContent((e) => {
        // Check if this was a simple typing change
        const isSimpleTyping =
          e.changes.length === 1 &&
          e.changes[0].text.length <= 1 && // Single character or deletion
          !e.changes[0].text.includes('\n'); // No line breaks

        lastChangeWasTypingRef.current = isSimpleTyping;
      });

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

  useEffect(() => {
    // After editor is mounted or workflowId changes, validate the initial content
    if (isEditorMounted && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== '') {
        changeSideEffects(false); // Initial validation, not typing
      }
    }
  }, [changeSideEffects, isEditorMounted, workflowId]);

  // Force refresh of decorations when props.value changes externally (e.g., switching executions)
  useEffect(() => {
    if (isEditorMounted && editorRef.current && props.value !== undefined) {
      // Check if this is an external change (not from our own typing)
      const isExternalChange = props.value !== lastInternalValueRef.current;

      if (isExternalChange) {
        // Always clear decorations first when switching executions/revisions
        clearAllDecorations();

        // Check if Monaco editor content matches props.value
        const model = editorRef.current.getModel();
        if (model) {
          const currentContent = model.getValue();
          if (currentContent !== props.value) {
            // Wait a bit longer for Monaco to update its content, then force re-parse
            setTimeout(() => {
              changeSideEffects(false); // External change, not typing
            }, 50); // Longer delay to ensure Monaco editor content is updated
          } else {
            // Content matches, just force re-parse to be safe
            setTimeout(() => {
              changeSideEffects(false); // External change, not typing
            }, 10);
          }
        }

        // Update our tracking ref
        lastInternalValueRef.current = props.value;
      }
    }
  }, [props.value, isEditorMounted, changeSideEffects, clearAllDecorations]);

  // Force decoration refresh specifically when switching to readonly mode (executions view)
  useEffect(() => {
    if (isEditorMounted) {
      // Small delay to ensure all state is settled
      setTimeout(() => {
        changeSideEffects(false); // Mode change, not typing
      }, 50);
    }
  }, [isEditorMounted, changeSideEffects]);

  useEffect(() => {
    const model = editorRef.current?.getModel() ?? null;
    if (alertTriggerDecorationCollectionRef.current) {
      // clear existing decorations
      alertTriggerDecorationCollectionRef.current.clear();
    }

    // Don't show alert dots when in executions view or when prerequisites aren't met
    if (!model || !yamlDocument || !isEditorMounted || readOnly || !editorRef.current) {
      return;
    }

    const triggerNodes = getTriggerNodes(yamlDocument);
    const alertTriggers = triggerNodes.filter(({ triggerType }) => triggerType === 'alert');

    if (alertTriggers.length === 0) {
      return;
    }

    const decorations = alertTriggers
      .map(({ node, typePair }) => {
        // Try to get the range from the typePair first, fallback to searching within the trigger node
        let typeRange = getMonacoRangeFromYamlNode(model, typePair);

        if (!typeRange) {
          // Fallback: use the trigger node range and search for the type line
          const triggerRange = getMonacoRangeFromYamlNode(model, node);
          if (!triggerRange) {
            return null;
          }

          // Find the specific line that contains "type:" and "alert" within this trigger
          let typeLineNumber = triggerRange.startLineNumber;
          for (
            let lineNum = triggerRange.startLineNumber;
            lineNum <= triggerRange.endLineNumber;
            lineNum++
          ) {
            const lineContent = model.getLineContent(lineNum);
            if (lineContent.includes('type:') && lineContent.includes('alert')) {
              typeLineNumber = lineNum;
              break;
            }
          }

          typeRange = new monaco.Range(
            typeLineNumber,
            1,
            typeLineNumber,
            model.getLineMaxColumn(typeLineNumber)
          );
        }

        const glyphDecoration: monaco.editor.IModelDeltaDecoration = {
          range: new monaco.Range(
            typeRange!.startLineNumber,
            1,
            typeRange!.startLineNumber,
            model.getLineMaxColumn(typeRange!.startLineNumber)
          ),
          options: {
            glyphMarginClassName: 'alert-trigger-glyph',
            glyphMarginHoverMessage: {
              value: i18n.translate(
                'workflows.workflowDetail.yamlEditor.alertTriggerGlyphTooltip',
                {
                  defaultMessage:
                    'Alert trigger: This workflow will be executed automatically only when connected to a rule via the "Run Workflow" action.',
                }
              ),
            },
          },
        };

        const lineHighlightDecoration: monaco.editor.IModelDeltaDecoration = {
          range: new monaco.Range(
            typeRange!.startLineNumber,
            1,
            typeRange!.startLineNumber,
            model.getLineMaxColumn(typeRange!.startLineNumber)
          ),
          options: {
            className: 'alert-trigger-highlight',
            marginClassName: 'alert-trigger-highlight',
            isWholeLine: true,
          },
        };

        return [glyphDecoration, lineHighlightDecoration];
      })
      .flat()
      .filter((d) => d !== null) as monaco.editor.IModelDeltaDecoration[];

    // Ensure we have a valid editor reference before creating decorations
    if (decorations.length > 0 && editorRef.current) {
      // Small delay to ensure Monaco editor is fully ready for decorations
      // This addresses race conditions where the editor is mounted but not fully initialized
      const createDecorations = () => {
        if (editorRef.current) {
          alertTriggerDecorationCollectionRef.current =
            editorRef.current.createDecorationsCollection(decorations);
        }
      };

      // Try immediately, and if that fails, try again with a small delay
      try {
        createDecorations();
      } catch (error) {
        setTimeout(createDecorations, 10);
      }
    }
  }, [isEditorMounted, yamlDocument, readOnly]);

  // Handle connector type decorations (GitLens-style inline icons)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isEditorMounted || !editorRef.current || !yamlDocument) {
        return;
      }

      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) {
        return;
      }

      // Clear existing decorations first
      if (connectorTypeDecorationCollectionRef.current) {
        connectorTypeDecorationCollectionRef.current.clear();
        connectorTypeDecorationCollectionRef.current = null;
      }

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      // Find all steps with connector types
      const stepNodes = getStepNodesWithType(yamlDocument);
      // console.log('🎨 Connector decorations: Found step nodes:', stepNodes.length);

      for (const stepNode of stepNodes) {
        // Find the main step type (not nested inside 'with' or other blocks)
        const typePair = stepNode.items.find((item): item is Pair<Scalar, Scalar> => {
          // Must be a direct child of the step node (not nested)
          return isPair(item) && isScalar(item.key) && item.key.value === 'type';
        });

        if (!typePair || !isScalar(typePair.value)) {
          continue;
        }

        const connectorType = typePair.value.value;

        if (typeof connectorType !== 'string') {
          continue;
        }

        // console.log('🎨 Processing connector type:', connectorType);

        // Skip decoration for very short connector types to avoid false matches
        // allow "if" as a special case
        if (connectorType.length < 3 && connectorType !== 'if') {
          // console.log('🎨 Skipping short connector type:', connectorType);
          continue; // Skip this iteration
        }

        const typeRange = typePair.value.range;

        if (!typeRange || !Array.isArray(typeRange) || typeRange.length < 3) continue;

        // Get icon and class based on connector type
        const { className } = getConnectorIcon(connectorType);

        if (className) {
          // typeRange format: [startOffset, valueStartOffset, endOffset]
          const valueStartOffset = typeRange[1]; // Start of the value (after quotes if present)
          const valueEndOffset = typeRange[2]; // End of the value

          // Convert character offsets to Monaco positions
          const startPosition = model.getPositionAt(valueStartOffset);
          const endPosition = model.getPositionAt(valueEndOffset);

          // Get the line content to check if "type:" is at the beginning
          const currentLineContent = model.getLineContent(startPosition.lineNumber);
          const trimmedLine = currentLineContent.trimStart();

          // Check if this line starts with "type:" (after whitespace)
          if (!trimmedLine.startsWith('type:')) {
            continue; // Skip this decoration
          }

          // Try to find the connector type in the start position line first
          let targetLineNumber = startPosition.lineNumber;
          let lineContent = model.getLineContent(targetLineNumber);
          let typeIndex = lineContent.indexOf(connectorType);

          // If not found on start line, check end line
          if (typeIndex === -1 && endPosition.lineNumber !== startPosition.lineNumber) {
            targetLineNumber = endPosition.lineNumber;
            lineContent = model.getLineContent(targetLineNumber);
            typeIndex = lineContent.indexOf(connectorType);
          }

          let actualStartColumn;
          let actualEndColumn;
          if (typeIndex !== -1) {
            // Found the connector type in the line
            actualStartColumn = typeIndex + 1; // +1 for 1-based indexing
            actualEndColumn = typeIndex + connectorType.length + 1; // +1 for 1-based indexing
          } else {
            // Fallback to calculated position
            targetLineNumber = startPosition.lineNumber;
            actualStartColumn = startPosition.column;
            actualEndColumn = endPosition.column;
          }

          // Background highlighting and after content (working version)
          const decorationsToAdd = [
            // Background highlighting on the connector type text
            {
              range: {
                startLineNumber: targetLineNumber,
                startColumn: actualStartColumn,
                endLineNumber: targetLineNumber,
                endColumn: actualEndColumn,
              },
              options: {
                inlineClassName: `connector-inline-highlight connector-${className}`,
              },
            },
          ];

          decorations.push(...decorationsToAdd);
        }
      }

      // console.log('🎨 Final decorations count:', decorations.length);
      if (decorations.length > 0) {
        connectorTypeDecorationCollectionRef.current =
          editor.createDecorationsCollection(decorations);
        // console.log('🎨 Applied connector decorations successfully');
      } else {
        // console.log('🎨 No decorations to apply');
      }
    }, 100); // Small delay to avoid multiple rapid executions

    return () => clearTimeout(timeoutId);
  }, [isEditorMounted, yamlDocument]);

  // Trigger type decorations effect
  useEffect(() => {
    if (!isEditorMounted || !editorRef.current || !yamlDocument) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const editor = editorRef.current!;
      const model = editor.getModel();
      if (!model) return;

      // Clear existing trigger decorations
      if (triggerTypeDecorationCollectionRef.current) {
        triggerTypeDecorationCollectionRef.current.clear();
        triggerTypeDecorationCollectionRef.current = null;
      }

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      // Find all triggers with type
      const triggerNodes = getTriggerNodesWithType(yamlDocument);

      for (const triggerNode of triggerNodes) {
        const typePair = triggerNode.items.find(
          (item): item is Pair<Scalar, Scalar> =>
            isPair(item) && isScalar(item.key) && isScalar(item.value) && item.key.value === 'type'
        );
        if (!typePair?.value?.value) {
          continue;
        }

        const triggerType = typePair.value.value;

        if (typeof triggerType !== 'string') {
          continue;
        }

        // Skip decoration for very short trigger types to avoid false matches
        if (triggerType.length < 3) {
          continue; // Skip this iteration
        }

        const typeRange = typePair.value.range;

        if (!typeRange || !Array.isArray(typeRange) || typeRange.length < 3) {
          continue;
        }

        // Get icon and class based on trigger type
        const { className } = getTriggerIcon(triggerType);

        if (className) {
          // typeRange format: [startOffset, valueStartOffset, endOffset]
          const valueStartOffset = typeRange[1]; // Start of the value (after quotes if present)
          const valueEndOffset = typeRange[2]; // End of the value

          // Convert character offsets to Monaco positions
          const startPosition = model.getPositionAt(valueStartOffset);
          const endPosition = model.getPositionAt(valueEndOffset);

          // Get the line content to check if "type:" is at the beginning
          const currentLineContent = model.getLineContent(startPosition.lineNumber);
          const trimmedLine = currentLineContent.trimStart();

          // Check if this line contains "type:" (after whitespace and optional dash for array items)
          if (!trimmedLine.startsWith('type:') && !trimmedLine.startsWith('- type:')) {
            continue; // Skip this decoration
          }

          // Try to find the trigger type in the start position line first
          let targetLineNumber = startPosition.lineNumber;
          let lineContent = model.getLineContent(targetLineNumber);
          let typeIndex = lineContent.indexOf(triggerType);

          // If not found on start line, check end line
          if (typeIndex === -1 && endPosition.lineNumber !== startPosition.lineNumber) {
            targetLineNumber = endPosition.lineNumber;
            lineContent = model.getLineContent(targetLineNumber);
            typeIndex = lineContent.indexOf(triggerType);
          }

          let actualStartColumn;
          let actualEndColumn;
          if (typeIndex !== -1) {
            // Found the trigger type in the line
            actualStartColumn = typeIndex + 1; // +1 for 1-based indexing
            actualEndColumn = typeIndex + triggerType.length + 1; // +1 for 1-based indexing
          } else {
            // Fallback to calculated position
            targetLineNumber = startPosition.lineNumber;
            actualStartColumn = startPosition.column;
            actualEndColumn = endPosition.column;
          }

          // Background highlighting for trigger types
          const decorationsToAdd = [
            // Background highlighting on the trigger type text
            {
              range: {
                startLineNumber: targetLineNumber,
                startColumn: actualStartColumn,
                endLineNumber: targetLineNumber,
                endColumn: actualEndColumn,
              },
              options: {
                inlineClassName: `trigger-inline-highlight trigger-${className}`,
              },
            },
          ];

          decorations.push(...decorationsToAdd);
        }
      }

      if (decorations.length > 0) {
        triggerTypeDecorationCollectionRef.current =
          editor.createDecorationsCollection(decorations);
      }
    }, 100); // Small delay to avoid multiple rapid executions

    return () => clearTimeout(timeoutId);
  }, [isEditorMounted, yamlDocument]);

  // Helper function to get connector icon and class
  const getConnectorIcon = (connectorType: string): { className: string } => {
    if (connectorType.startsWith('elasticsearch.')) {
      return { className: 'elasticsearch' };
    } else if (connectorType.startsWith('kibana.')) {
      return { className: 'kibana' };
    } else {
      // Handle connectors with dot notation properly
      let className: string;
      if (connectorType.startsWith('.')) {
        // For connectors like ".jira", remove the leading dot
        className = connectorType.substring(1);
      } else if (connectorType.includes('.')) {
        // For connectors like "thehive.createAlert", use base name
        className = connectorType.split('.')[0];
      } else {
        // For simple connectors like "slack", use as-is
        className = connectorType;
      }
      return { className };
    }
  };

  // Helper function to get trigger icon and class
  const getTriggerIcon = (triggerType: string): { className: string } => {
    switch (triggerType) {
      case 'alert':
        return { className: 'alert' };
      case 'scheduled':
        return { className: 'scheduled' };
      case 'manual':
        return { className: 'manual' };
      default:
        return { className: triggerType };
    }
  };

  const completionProvider = useMemo(() => {
    return getCompletionItemProvider(workflowYamlSchemaLoose, connectorsData?.connectorTypes);
  }, [workflowYamlSchemaLoose, connectorsData?.connectorTypes]);

  useWorkflowsMonacoTheme();

  // Apply dynamic connector icons via CSS injection
  useDynamicConnectorIcons(connectorsData);

  const editorOptions = useMemo<monaco.editor.IStandaloneEditorConstructionOptions>(
    () => ({
      readOnly,
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
        triggerCharacters: true,
        minWordLength: 0, // Show suggestions after 1 character
        filterGraceful: true, // Better filtering
        localityBonus: true, // Prioritize matches near cursor
        suggestOnTriggerCharacters: true,
      },
      wordBasedSuggestions: false,
      hover: {
        enabled: true,
        delay: 300,
        sticky: true,
        above: false, // Force hover below cursor to avoid clipping
      },
      formatOnType: true,
    }),
    [readOnly]
  );

  // Styles are now handled by the useWorkflowEditorStyles hook above

  // Clean up the monaco model and editor on unmount
  useEffect(() => {
    const editor = editorRef.current;
    return () => {
      // Dispose of Monaco providers
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];

      // Dispose of decorations and actions provider
      unifiedProvidersRef.current?.actions?.dispose();
      unifiedProvidersRef.current?.stepExecution?.dispose();
      unifiedProvidersRef.current = null;

      editor?.dispose();
    };
  }, []);

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
              <div
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 6px',
                  color: euiTheme.colors.textSubdued,
                  cursor: 'pointer',
                  borderRadius: euiTheme.border.radius.small,
                  fontSize: '12px',
                  '&:hover': {
                    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                    color: euiTheme.colors.primaryText,
                  },
                }}
                onClick={() => {
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
                }}
                role="button"
                tabIndex={0}
                title="Download JSON schema for debugging"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.currentTarget.click();
                  }
                }}
              >
                <EuiIcon type="download" size="s" />
                <span>Schema</span>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      )}
      <div css={styles.editorContainer}>
        <YamlEditor
          editorDidMount={handleEditorDidMount}
          editorWillUnmount={handleEditorWillUnmount}
          onChange={handleChange}
          options={editorOptions}
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
          onErrorClick={(error) => {
            if (!editorRef.current) {
              return;
            }
            navigateToErrorPosition(editorRef.current, error.startLineNumber, error.startColumn);
          }}
          rightSide={<WorkflowYAMLEditorShortcuts />}
        />
      </div>
    </div>
  );
};
