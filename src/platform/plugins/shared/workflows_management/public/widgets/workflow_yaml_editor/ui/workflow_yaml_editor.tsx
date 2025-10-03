/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  transparentize,
  EuiIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { getJsonSchemaFromYamlSchema, isTriggerType } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import type { SchemasSettings } from 'monaco-yaml';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import YAML, { type Pair, type Scalar, isPair, isScalar } from 'yaml';
import {
  getStepNodesWithType,
  getTriggerNodes,
  getTriggerNodesWithType,
} from '../../../../common/lib/yaml_utils';
import { formatValidationError, getCurrentPath } from '../../../../common/lib/yaml_utils';
import { getWorkflowZodSchema, getWorkflowZodSchemaLoose } from '../../../../common/schema';
import { UnsavedChangesPrompt } from '../../../shared/ui/unsaved_changes_prompt';
import { YamlEditor } from '../../../shared/ui/yaml_editor';
import { getCompletionItemProvider } from '../lib/get_completion_item_provider';
import {
  ElasticsearchMonacoConnectorHandler,
  GenericMonacoConnectorHandler,
  KibanaMonacoConnectorHandler,
} from '../lib/monaco_connectors';
import {
  createStepExecutionProvider,
  createUnifiedActionsProvider,
  registerMonacoConnectorHandler,
  registerUnifiedHoverProvider,
} from '../lib/monaco_providers';
import { useYamlValidation } from '../lib/use_yaml_validation';
import { getMonacoRangeFromYamlNode, navigateToErrorPosition } from '../lib/utils';
import type { YamlValidationError } from '../model/types';
import { ElasticsearchStepActions } from './elasticsearch_step_actions';
import { ActionsMenuPopover } from '../../../features/actions_menu_popover';
import type { ActionOptionData } from '../../../features/actions_menu_popover/types';
import { WorkflowYAMLValidationErrors } from './workflow_yaml_validation_errors';
import { WorkflowYAMLEditorShortcuts } from './workflow_yaml_editor_shortcuts';
import { insertTriggerSnippet } from '../lib/snippets/insert_trigger_snippet';
import { insertStepSnippet } from '../lib/snippets/insert_step_snippet';
import { useRegisterKeyboardCommands } from '../lib/use_register_keyboard_commands';

const WorkflowSchemaUri = 'file:///workflow-schema.json';

const useWorkflowJsonSchema = () => {
  // Generate JSON schema dynamically to include all current connectors
  // Now uses lazy loading to keep large generated files out of main bundle
  return useMemo(() => {
    try {
      const zodSchema = getWorkflowZodSchema();
      const jsonSchema = getJsonSchemaFromYamlSchema(zodSchema);

      // Post-process to improve validation messages and reduce duplicate suggestions
      const processedSchema = improveTypeFieldDescriptions(jsonSchema);

      return processedSchema ?? null;
    } catch (error) {
      // console.error('🚨 Schema generation failed:', error);
      return null;
    }
  }, []);
};

/**
 * Since we implemented custom error formatting at the validation level,
 * we no longer need to modify the schema. The full validation works with
 * user-friendly error messages.
 */
function improveTypeFieldDescriptions(schema: any): any {
  // Return schema as-is - custom error formatter handles user experience
  return schema;
}

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
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationError[]>>;
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

  // Only show debug features in development
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const workflowJsonSchema = useWorkflowJsonSchema();
  const schemas: SchemasSettings[] = useMemo(() => {
    return [
      {
        fileMatch: ['*'],
        // casting here because zod-to-json-schema returns a more complex type than JSONSchema7 expected by monaco-yaml
        schema: workflowJsonSchema as any,
        uri: WorkflowSchemaUri,
      },
    ];
  }, [workflowJsonSchema]);

  const [yamlDocument, setYamlDocument] = useState<YAML.Document | null>(null);
  const yamlDocumentRef = useRef<YAML.Document | null>(null);
  const stepExecutionsRef = useRef<WorkflowStepExecutionDto[] | undefined>(stepExecutions);

  // Keep stepExecutionsRef in sync
  useEffect(() => {
    stepExecutionsRef.current = stepExecutions;
  }, [stepExecutions]);

  // REMOVED: highlightStepDecorationCollectionRef - now handled by UnifiedActionsProvider
  // REMOVED: stepExecutionsDecorationCollectionRef - now handled by StepExecutionProvider
  const alertTriggerDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const triggerTypeDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const connectorTypeDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const unifiedProvidersRef = useRef<{
    hover: any;
    actions: any;
    stepExecution: any;
  } | null>(null);

  // Disposables for Monaco providers
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  const [editorActionsCss, setEditorActionsCss] = useState<React.CSSProperties>({
    display: 'none',
  });

  // Memoize the schema to avoid re-generating it on every render
  const workflowYamlSchemaLoose = useMemo(() => {
    return getWorkflowZodSchemaLoose(); // Now uses lazy loading
  }, []);

  const changesHighlightDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const {
    error: errorValidating,
    validationErrors,
    validateVariables,
    handleMarkersChanged,
  } = useYamlValidation({
    workflowYamlSchema: workflowYamlSchemaLoose,
    onValidationErrors,
  });

  const [isEditorMounted, setIsEditorMounted] = useState(false);

  // Helper to compute diff lines
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
        validateVariables(editorRef.current);
        try {
          const value = model.getValue();
          const parsedDocument = YAML.parseDocument(value ?? '');
          setYamlDocument(parsedDocument);
          yamlDocumentRef.current = parsedDocument;
        } catch (error) {
          // console.error('❌ Error parsing YAML document:', error);
          clearAllDecorations();
          setYamlDocument(null);
          yamlDocumentRef.current = null;
        }
      }
    },
    [validateVariables, clearAllDecorations]
  );

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
        validateVariables(editor);
        try {
          const parsedDocument = YAML.parseDocument(value);
          // Use setTimeout to defer state updates until after the current render cycle
          // This prevents the flushSync warning while maintaining the correct order
          setTimeout(() => {
            setYamlDocument(parsedDocument);
            setIsEditorMounted(true);
          }, 0);
        } catch (error) {
          setTimeout(() => {
            setYamlDocument(null);
            setIsEditorMounted(true);
          }, 0);
        }
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
        getYamlDocument: () => yamlDocumentRef.current,
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
      const markerInterceptor = function (editorModel: any, owner: string, markers: any[]) {
        // Only process YAML validation markers

        // Only modify YAML validation markers
        if (owner === 'yaml') {
          const fixedMarkers = markers.map((marker) => {
            // Check if this is a validation error that could benefit from dynamic formatting
            const hasNumericEnumPattern =
              // Patterns with quotes: Expected "0 | 1 | 2"
              /Expected "\d+(\s*\|\s*\d+)*"/.test(marker.message || '') ||
              /Incorrect type\. Expected "\d+(\s*\|\s*\d+)*"/.test(marker.message || '') ||
              // Patterns with escaped quotes: Expected \"0 | 1\"
              /Expected \\\\"?\d+(\s*\|\s*\d+)*\\\\"?/.test(marker.message || '') ||
              // Patterns without quotes: Expected 0 | 1
              /Expected \d+(\s*\|\s*\d+)*(?!\w)/.test(marker.message || '') ||
              // Additional patterns for different Monaco YAML error formats
              /Invalid enum value\. Expected \d+(\s*\|\s*\d+)*/.test(marker.message || '') ||
              /Value must be one of: \d+(\s*,\s*\d+)*/.test(marker.message || '');

            // Check for field type errors (like "Expected settings", "Expected connector", etc.)
            const hasFieldTypeError =
              /Incorrect type\. Expected "[a-zA-Z_][a-zA-Z0-9_]*"/.test(marker.message || '') ||
              /Expected "[a-zA-Z_][a-zA-Z0-9_]*"/.test(marker.message || '');

            // Also check for the current message pattern we're seeing
            const hasConnectorEnumPattern = marker.message?.includes(
              'Expected ".none" | ".cases-webhook"'
            );

            // Process markers that match our patterns

            if (hasNumericEnumPattern || hasConnectorEnumPattern || hasFieldTypeError) {
              try {
                // Get the YAML path at this marker position to determine context
                const currentYamlDocument = yamlDocumentRef.current;
                let yamlPath: (string | number)[] = [];

                if (currentYamlDocument) {
                  const markerPosition = editorModel.getOffsetAt({
                    lineNumber: marker.startLineNumber,
                    column: marker.startColumn,
                  });
                  yamlPath = getCurrentPath(currentYamlDocument, markerPosition);
                }

                // Create a mock Zod error with the path information
                const mockZodError = {
                  issues: [
                    {
                      code: 'unknown' as const,
                      path: yamlPath,
                      message: marker.message,
                      received: 'unknown',
                    },
                  ],
                };

                // Use the dynamic formatValidationError with schema and YAML document
                const { message: formattedMessage } = formatValidationError(
                  mockZodError as any,
                  workflowYamlSchemaLoose,
                  currentYamlDocument
                );

                // Return the marker with the improved message

                return {
                  ...marker,
                  message: formattedMessage,
                };
              } catch (error) {
                // Fallback to original message if dynamic formatting fails
                return marker;
              }
            }
            return marker;
          });

          // Call the original function with fixed markers
          return originalSetModelMarkers.call(monaco.editor, editorModel, owner, fixedMarkers);
        }

        // For non-YAML markers, call original function unchanged
        return originalSetModelMarkers.call(monaco.editor, editorModel, owner, markers);
      };

      // Override Monaco's setModelMarkers function
      monaco.editor.setModelMarkers = markerInterceptor;

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

      // Create other providers
      const actionsProvider = createUnifiedActionsProvider(editor, providerConfig);
      // Decorations provider disabled - user prefers only step background highlighting, not green dots
      // const decorationsProvider = createUnifiedDecorationsProvider(editor, providerConfig);

      // Setup event listener for CSS updates from actions provider
      const handleCssUpdate = (event: CustomEvent) => {
        setEditorActionsCss(event.detail || {});
      };
      window.addEventListener('updateEditorActionsCss', handleCssUpdate as EventListener);
      disposablesRef.current.push({
        dispose: () => {
          window.removeEventListener('updateEditorActionsCss', handleCssUpdate as EventListener);
        },
      });

      // Store provider references
      unifiedProvidersRef.current = {
        hover: null, // hover provider is managed by Monaco directly
        actions: actionsProvider,
        stepExecution: null, // will be created when needed
      };
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

  // Step execution provider - managed through provider architecture
  useEffect(() => {
    if (!isEditorMounted || !editorRef.current) {
      return;
    }

    // Always dispose existing provider when dependencies change to prevent stale decorations
    if (unifiedProvidersRef.current?.stepExecution) {
      unifiedProvidersRef.current.stepExecution.dispose();
      unifiedProvidersRef.current.stepExecution = null;
    }

    // Create step execution provider if needed and we're in readonly mode
    // Add a small delay to ensure YAML document is fully updated when switching executions
    const timeoutId = setTimeout(() => {
      try {
        // Ensure yamlDocumentRef is synchronized
        if (yamlDocument && !yamlDocumentRef.current) {
          yamlDocumentRef.current = yamlDocument;
        }

        // Additional check: if we have stepExecutions but no yamlDocument,
        // the document might not be parsed yet - skip and let next update handle it
        if (stepExecutions && stepExecutions.length > 0 && !yamlDocumentRef.current) {
          // console.warn(
          //   '🎯 StepExecutions present but no YAML document - waiting for document parse'
          // );
          return;
        }

        const stepExecutionProvider = createStepExecutionProvider(editorRef.current!, {
          getYamlDocument: () => {
            return yamlDocumentRef.current;
          },
          getStepExecutions: () => {
            return stepExecutionsRef.current || [];
          },
          getHighlightStep: () => highlightStep || null,
        });

        if (unifiedProvidersRef.current) {
          unifiedProvidersRef.current.stepExecution = stepExecutionProvider;
        }
      } catch (error) {
        // console.error('🎯 WorkflowYAMLEditor: Error creating StepExecutionProvider:', error);
      }
    }, 20); // Small delay to ensure YAML document is ready

    return () => clearTimeout(timeoutId);
  }, [isEditorMounted, stepExecutions, highlightStep, yamlDocument]);

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
    } else if (connectorType.startsWith('inference')) {
      return { className: 'inference' };
    } else {
      return { className: connectorType };
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
    return getCompletionItemProvider(workflowYamlSchemaLoose); // Use memoized schema
  }, [workflowYamlSchemaLoose]);

  useEffect(() => {
    monaco.editor.defineTheme('workflows-subdued', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': euiTheme.colors.backgroundBaseSubdued,
        'editorHoverWidget.foreground': euiTheme.colors.textParagraph,
        'editorHoverWidget.background': euiTheme.colors.backgroundBasePlain,
        'editorHoverWidget.border': euiTheme.colors.borderBasePlain,
      },
    });

    // Add global CSS for Monaco hover widgets - avoid interfering with internal widgets
    const styleId = 'workflow-monaco-hover-styles';
    const existingStyle = document.getElementById(styleId);

    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Enhanced Monaco hover styling for workflow editor - EXCLUDE glyph and contrib widgets */
        .monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]),
        .monaco-hover:not([class*="contrib"]):not([class*="glyph"]) {
          width: 600px;
          min-width: 500px;
          max-width: 800px;
          max-height: 400px;
          font-size: 13px;
        }
        
        .monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]) .monaco-hover-content,
        .monaco-hover:not([class*="contrib"]):not([class*="glyph"]) .monaco-hover-content {
          width: 100%;
          min-width: 500px;
          max-width: 800px;
          padding: 4px 8px;
        }
        
        .monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]) .hover-contents,
        .monaco-hover:not([class*="contrib"]):not([class*="glyph"]) .hover-contents {
          width: 100%;
          min-width: 500px;
          max-width: 800px;
        }
        
        /* Ensure Monaco's internal glyph hover widgets are never hidden */
        .monaco-editor [class*="modesGlyphHoverWidget"],
        .monaco-editor [class*="glyph"][class*="hover"] {
          display: block !important;
          visibility: visible !important;
        }
        
        /* Connector type decorations - GitLens style inline icons */
        .connector-decoration {
          margin-left: 4px;
          pointer-events: none;
          user-select: none;
          display: inline-block;
          position: relative;
          opacity: 0.8;
        }
        
        /* Subtle background highlighting for connector types only */
        .connector-inline-highlight {
          background-color: rgba(255, 165, 0, 0.12) !important;
          border-radius: 3px !important;
          padding: 1px 3px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        }
        
        .connector-inline-highlight.connector-elasticsearch {
          background-color: rgba(255, 215, 0, 0.12) !important;
          box-shadow: 0 1px 2px rgba(255, 215, 0, 0.2) !important;
        }
        
        .connector-inline-highlight::after {
          content: '';
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-left: 4px;
          vertical-align: middle;
          position: relative;
          top: -1px;
        }

        /* FOR SHADOW ICONS */

        .connector-inline-highlight.connector-elasticsearch::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyBkYXRhLXR5cGU9ImxvZ29FbGFzdGljIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDMyIDMyIj4KPHBhdGggZD0iTTI3LjU2NDggMTEuMjQyNUMzMi42NjU0IDEzLjE4MiAzMi40MzczIDIwLjYzNzggMjcuMzE5NyAyMi4zNjk0TDI3LjE1NzYgMjIuNDI0MUwyNi45OTA2IDIyLjM4NTFMMjEuNzEwMyAyMS4xNDY4TDIxLjQ0MjcgMjEuMDg0M0wyMS4zMTU4IDIwLjg0MDFMMTkuOTE1NCAxOC4xNDk3TDE5LjY5ODYgMTcuNzMyN0wyMC4wNTExIDE3LjQyMjJMMjYuOTU1NCAxMS4zNTI4TDI3LjIyNjkgMTEuMTEzNkwyNy41NjQ4IDExLjI0MjVaIiBmaWxsPSIjMEI2NEREIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNMjIuMDQ3MiAyMS4yMzlMMjYuODQ3IDIyLjM2NEwyNy4xNjI1IDIyLjQzODJMMjcuMjczOCAyMi43NDE5TDI3LjMzOTIgMjIuOTMyNEMyNy45NjE1IDI0Ljg5NjIgMjcuMDc5NyAyNi43MTE3IDI1LjY4NjkgMjcuNzI5MkMyNC4yNTI4IDI4Ljc3NjcgMjIuMTc3NSAyOS4wNDg4IDIwLjUwNTIgMjcuNzUwN0wyMC4yMTUyIDI3LjUyNjFMMjAuMjgzNiAyNy4xNjQ4TDIxLjMyMDcgMjEuNzEwN0wyMS40Mzc5IDIxLjA5NjRMMjIuMDQ3MiAyMS4yMzlaIiBmaWxsPSIjOUFEQzMwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNNS4wMTA3NCA5LjYyOTk3TDEwLjI3NzMgMTAuODg0OUwxMC41NTk2IDEwLjk1MjJMMTAuNjgxNiAxMS4yMTU5TDExLjkxNyAxMy44NjUzTDEyLjEwMzUgMTQuMjY2N0wxMS43NzY0IDE0LjU2MzZMNS4wNDI5NyAyMC42NjQyTDQuNzcwNTEgMjAuOTEyMkw0LjQyNTc4IDIwLjc4MDRDMS45Mzg5IDE5LjgzMDMgMC43MjA0MDcgMTcuNDU1OCAwLjc1MTk1MyAxNS4xNTM0QzAuNzgzNjg2IDEyLjg0NTMgMi4wNzMwNSAxMC41MDk0IDQuNjgzNTkgOS42NDQ2Mkw0Ljg0NTcgOS41OTA5MUw1LjAxMDc0IDkuNjI5OTdaIiBmaWxsPSIjMUJBOUY1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNNi4yODEwMSA0LjMxOTgyQzcuNjk3MjMgMy4yMzk0IDkuNzYxMzUgMi45MzM0IDExLjUwMjcgNC4yNTE0NkwxMS43OTk2IDQuNDc3MDVMMTEuNzI5MiA0Ljg0MzI2TDEwLjY3NzUgMTAuMzE2OUwxMC41NTkzIDEwLjkzMjFMOS45NDk5NSAxMC43ODc2TDUuMTUwMTUgOS42NTA4OEw0LjgzMzc0IDkuNTc1NjhMNC43MjMzOSA5LjI3MDAyQzQuMDE1MDcgNy4zMDI5NSA0Ljg3MjYzIDUuMzk0MjkgNi4yODEwMSA0LjMxOTgyWiIgZmlsbD0iI0YwNEU5OCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KPHBhdGggZD0iTTEyLjQ2NjEgMTQuNDMzMUwxOS40OTYzIDE3LjY0NEwxOS42ODM4IDE3LjczTDE5Ljc3ODYgMTcuOTEyNkwyMS4zMzQyIDIwLjg5NzlMMjEuNDI5OSAyMS4wODI1TDIxLjM5MDkgMjEuMjg3NkwyMC4yMjQ5IDI3LjM4OTJMMjAuMjAxNCAyNy41MTEyTDIwLjEzMzEgMjcuNjEzOEMxNy40NTM0IDMxLjU3MiAxMy4yMzA1IDMyLjMyNDUgOS44NjQ1IDMwLjg3MzVDNi41MDkzMiAyOS40MjcyIDQuMDMwNyAyNS44MDQ0IDQuNzM5NSAyMS4xMzgyTDQuNzcxNzMgMjAuOTI3Mkw0LjkyOTkzIDIwLjc4MzdMMTEuODEzNyAxNC41MzQ3TDEyLjEwNjcgMTQuMjY5TDEyLjQ2NjEgMTQuNDMzMVoiIGZpbGw9IiMwMkJDQjciIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS4yIi8+CjxwYXRoIGQ9Ik0xMS44OTIzIDQuNDEwMjJDMTQuNDM4MSAwLjY3NjQyNiAxOC43NDEgMC4xMDUzMDMgMjIuMTMzNSAxLjUzOTEyQzI1LjUyNjMgMi45NzMwMiAyOC4xMjMxIDYuNDU5NzkgMjcuMjM2MSAxMC45MDI0TDI3LjE5NyAxMS4xMDE2TDI3LjA0MzcgMTEuMjM1NEwxOS45NzgzIDE3LjQ0ODNMMTkuNjg1MyAxNy43MDYxTDE5LjMzMTggMTcuNTQzTDEyLjMyOTggMTQuMzMyMUwxMi4xMjg3IDE0LjI0MDNMMTIuMDM0OSAxNC4wMzkxTDEwLjY1NSAxMS4wNTE4TDEwLjU3NCAxMC44NzUxTDEwLjYxMTEgMTAuNjg0NkwxMS43OTk2IDQuNjMyODdMMTEuODIzIDQuNTExNzhMMTEuODkyMyA0LjQxMDIyWiIgZmlsbD0iI0ZFQzUxNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KPC9zdmc+");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-slack::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIj4KICAgIDxwYXRoIGZpbGw9IiNFMDFFNUEiIGQ9Ik02LjgxMjkwMzIzIDMuNDA2NDUxNjFDNi44MTI5MDMyMyA1LjIzODcwOTY4IDUuMzE2MTI5MDMgNi43MzU0ODM4NyAzLjQ4Mzg3MDk3IDYuNzM1NDgzODcgMS42NTE2MTI5IDYuNzM1NDgzODcuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSAzLjQwNjQ1MTYxLjE1NDgzODcxIDEuNTc0MTkzNTUgMS42NTE2MTI5LjA3NzQxOTM1NDggMy40ODM4NzA5Ny4wNzc0MTkzNTQ4TDYuODEyOTAzMjMuMDc3NDE5MzU0OCA2LjgxMjkwMzIzIDMuNDA2NDUxNjF6TTguNDkwMzIyNTggMy40MDY0NTE2MUM4LjQ5MDMyMjU4IDEuNTc0MTkzNTUgOS45ODcwOTY3Ny4wNzc0MTkzNTQ4IDExLjgxOTM1NDguMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEgMy40MDY0NTE2MUwxNS4xNDgzODcxIDExLjc0MTkzNTVDMTUuMTQ4Mzg3MSAxMy41NzQxOTM1IDEzLjY1MTYxMjkgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgOS45ODcwOTY3NyAxNS4wNzA5Njc3IDguNDkwMzIyNTggMTMuNTc0MTkzNSA4LjQ5MDMyMjU4IDExLjc0MTkzNTVMOC40OTAzMjI1OCAzLjQwNjQ1MTYxeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAxNi43NzQpIi8+CiAgICA8cGF0aCBmaWxsPSIjMzZDNUYwIiBkPSJNMTEuODE5MzU0OCA2LjgxMjkwMzIzQzkuOTg3MDk2NzcgNi44MTI5MDMyMyA4LjQ5MDMyMjU4IDUuMzE2MTI5MDMgOC40OTAzMjI1OCAzLjQ4Mzg3MDk3IDguNDkwMzIyNTggMS42NTE2MTI5IDkuOTg3MDk2NzcuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSAxMy42NTE2MTI5LjE1NDgzODcxIDE1LjE0ODM4NzEgMS42NTE2MTI5IDE1LjE0ODM4NzEgMy40ODM4NzA5N0wxNS4xNDgzODcxIDYuODEyOTAzMjMgMTEuODE5MzU0OCA2LjgxMjkwMzIzek0xMS44MTkzNTQ4IDguNDkwMzIyNThDMTMuNjUxNjEyOSA4LjQ5MDMyMjU4IDE1LjE0ODM4NzEgOS45ODcwOTY3NyAxNS4xNDgzODcxIDExLjgxOTM1NDggMTUuMTQ4Mzg3MSAxMy42NTE2MTI5IDEzLjY1MTYxMjkgMTUuMTQ4Mzg3MSAxMS44MTkzNTQ4IDE1LjE0ODM4NzFMMy40ODM4NzA5NyAxNS4xNDgzODcxQzEuNjUxNjEyOSAxNS4xNDgzODcxLjE1NDgzODcxIDEzLjY1MTYxMjkuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSA5Ljk4NzA5Njc3IDEuNjUxNjEyOSA4LjQ5MDMyMjU4IDMuNDgzODcwOTcgOC40OTAzMjI1OEwxMS44MTkzNTQ4IDguNDkwMzIyNTh6Ii8+CiAgICA8cGF0aCBmaWxsPSIjMkVCNjdEIiBkPSJNOC40MTI5MDMyMyAxMS44MTkzNTQ4QzguNDEyOTAzMjMgOS45ODcwOTY3NyA5LjkwOTY3NzQyIDguNDkwMzIyNTggMTEuNzQxOTM1NSA4LjQ5MDMyMjU4IDEzLjU3NDE5MzUgOC40OTAzMjI1OCAxNS4wNzA5Njc3IDkuOTg3MDk2NzcgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgMTMuNjUxNjEyOSAxMy41NzQxOTM1IDE1LjE0ODM4NzEgMTEuNzQxOTM1NSAxNS4xNDgzODcxTDguNDEyOTAzMjMgMTUuMTQ4Mzg3MSA4LjQxMjkwMzIzIDExLjgxOTM1NDh6TTYuNzM1NDgzODcgMTEuODE5MzU0OEM2LjczNTQ4Mzg3IDEzLjY1MTYxMjkgNS4yMzg3MDk2OCAxNS4xNDgzODcxIDMuNDA2NDUxNjEgMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEuMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTEuODE5MzU0OEwuMDc3NDE5MzU0OCAzLjQ4Mzg3MDk3Qy4wNzc0MTkzNTQ4IDEuNjUxNjEyOSAxLjU3NDE5MzU1LjE1NDgzODcxIDMuNDA2NDUxNjEuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSA2LjczNTQ4Mzg3IDEuNjUxNjEyOSA2LjczNTQ4Mzg3IDMuNDgzODcwOTdMNi43MzU0ODM4NyAxMS44MTkzNTQ4eiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTYuNzc0KSIvPgogICAgPHBhdGggZmlsbD0iI0VDQjIyRSIgZD0iTTMuNDA2NDUxNjEgOC40MTI5MDMyM0M1LjIzODcwOTY4IDguNDEyOTAzMjMgNi43MzU0ODM4NyA5LjkwOTY3NzQyIDYuNzM1NDgzODcgMTEuNzQxOTM1NSA2LjczNTQ4Mzg3IDEzLjU3NDE5MzUgNS4yMzg3MDk2OCAxNS4wNzA5Njc3IDMuNDA2NDUxNjEgMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcuMDc3NDE5MzU0OCAxMy41NzQxOTM1LjA3NzQxOTM1NDggMTEuNzQxOTM1NUwuMDc3NDE5MzU0OCA4LjQxMjkwMzIzIDMuNDA2NDUxNjEgOC40MTI5MDMyM3pNMy40MDY0NTE2MSA2LjczNTQ4Mzg3QzEuNTc0MTkzNTUgNi43MzU0ODM4Ny4wNzc0MTkzNTQ4IDUuMjM4NzA5NjguMDc3NDE5MzU0OCAzLjQwNjQ1MTYxLjA3NzQxOTM1NDggMS41NzQxOTM1NSAxLjU3NDE5MzU1LjA3NzQxOTM1NDggMy40MDY0NTE2MS4wNzc0MTkzNTQ4TDExLjc0MTkzNTUuMDc3NDE5MzU0OEMxMy41NzQxOTM1LjA3NzQxOTM1NDggMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcgMy40MDY0NTE2MSAxNS4wNzA5Njc3IDUuMjM4NzA5NjggMTMuNTc0MTkzNSA2LjczNTQ4Mzg3IDExLjc0MTkzNTUgNi43MzU0ODM4N0wzLjQwNjQ1MTYxIDYuNzM1NDgzODd6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi43NzQgMTYuNzc0KSIvPgogIDwvZz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-kibana::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQpIj4KICAgIDxwb2x5Z29uIGZpbGw9IiNGMDRFOTgiIHBvaW50cz0iMCAwIDAgMjguNzg5IDI0LjkzNSAuMDE3Ii8+CiAgICA8cGF0aCBjbGFzcz0iZXVpSWNvbl9fZmlsbE5lZ2F0aXZlIiBkPSJNMCwxMiBMMCwyOC43ODkgTDExLjkwNiwxNS4wNTEgQzguMzY4LDEzLjExNSA0LjMxNywxMiAwLDEyIi8+CiAgICA8cGF0aCBmaWxsPSIjMDBCRkIzIiBkPSJNMTQuNDc4NSwxNi42NjQgTDIuMjY3NSwzMC43NTQgTDEuMTk0NSwzMS45OTEgTDI0LjM4NjUsMzEuOTkxIEMyMy4xMzQ1LDI1LjY5OSAxOS41MDM1LDIwLjI3MiAxNC40Nzg1LDE2LjY2NCIvPgogIDwvZz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-inference::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAuNWEuNS41IDAgMCAwLTEgMGMwIC40Mi0uMTMgMS4wNjEtLjUwNiAxLjU4M0MxMC4xMzcgMi41NzkgOS41MzcgMyA4LjUgM2EuNS41IDAgMCAwIDAgMWMxLjAzNyAwIDEuNjM3LjQyIDEuOTk0LjkxN0MxMC44NyA1LjQ0IDExIDYuMDggMTEgNi41YS41LjUgMCAwIDAgMSAwYzAtLjQyLjEzLTEuMDYxLjUwNi0xLjU4My4zNTctLjQ5Ni45NTctLjkxNyAxLjk5NC0uOTE3YS41LjUgMCAwIDAgMC0xYy0xLjAzNyAwLTEuNjM3LS40Mi0xLjk5NC0uOTE3QTIuODUyIDIuODUyIDAgMCAxIDEyIC41Wm0uNTg0IDNhMy4xIDMuMSAwIDAgMS0uODktLjgzMyAzLjQwNyAzLjQwNyAwIDAgMS0uMTk0LS4zMDIgMy40MDcgMy40MDcgMCAwIDEtLjE5NC4zMDIgMy4xIDMuMSAwIDAgMS0uODkuODMzIDMuMSAzLjEgMCAwIDEgLjg5LjgzM2MuMDcuMDk5LjEzNi4yLjE5NC4zMDIuMDU5LS4xMDIuMTIzLS4yMDMuMTk0LS4zMDJhMy4xIDMuMSAwIDAgMSAuODktLjgzM1pNNiAzLjVhLjUuNSAwIDAgMC0xIDB2LjAwNmExLjk4NCAxLjk4NCAwIDAgMS0uMDA4LjE3MyA1LjY0IDUuNjQgMCAwIDEtLjA2My41MiA1LjY0NSA1LjY0NSAwIDAgMS0uNTAxIDEuNTc3Yy0uMjgzLjU2Ni0uNyAxLjExNy0xLjMxNSAxLjUyN0MyLjUwMSA3LjcxIDEuNjYzIDggLjUgOGEuNS41IDAgMCAwIDAgMWMxLjE2MyAwIDIuMDAxLjI5IDIuNjEzLjY5Ny42MTYuNDEgMS4wMzIuOTYgMS4zMTUgMS41MjcuMjg0LjU2Ny40MjggMS4xNC41IDEuNTc3YTUuNjQ1IDUuNjQ1IDAgMCAxIC4wNzIuNjkzdi4wMDVhLjUuNSAwIDAgMCAxIC4wMDF2LS4wMDZhMS45OTUgMS45OTUgMCAwIDEgLjAwOC0uMTczIDYuMTQgNi4xNCAwIDAgMSAuMDYzLS41MmMuMDczLS40MzYuMjE3LTEuMDEuNTAxLTEuNTc3LjI4My0uNTY2LjctMS4xMTcgMS4zMTUtMS41MjdDOC40OTkgOS4yOSA5LjMzNyA5IDEwLjUgOWEuNS41IDAgMCAwIDAtMWMtMS4xNjMgMC0yLjAwMS0uMjktMi42MTMtLjY5Ny0uNjE2LS40MS0xLjAzMi0uOTYtMS4zMTUtMS41MjdhNS42NDUgNS42NDUgMCAwIDEtLjUtMS41NzdBNS42NCA1LjY0IDAgMCAxIDYgMy41MDZWMy41Wm0xLjk4OSA1YTQuNzE3IDQuNzE3IDAgMCAxLS42NTctLjM2NWMtLjc5MS0uNTI4LTEuMzEyLTEuMjI3LTEuNjU0LTEuOTExYTUuOTQzIDUuOTQzIDAgMCAxLS4xNzgtLjM5MWMtLjA1My4xMy0uMTEyLjI2LS4xNzguMzktLjM0Mi42ODUtLjg2MyAxLjM4NC0xLjY1NCAxLjkxMmE0LjcxOCA0LjcxOCAwIDAgMS0uNjU3LjM2NWMuMjM2LjEwOC40NTQuMjMuNjU3LjM2NS43OTEuNTI4IDEuMzEyIDEuMjI3IDEuNjU0IDEuOTExLjA2Ni4xMzEuMTI1LjI2Mi4xNzguMzkxLjA1My0uMTMuMTEyLS4yNi4xNzgtLjM5LjM0Mi0uNjg1Ljg2My0xLjM4NCAxLjY1NC0xLjkxMi4yMDMtLjEzNS40MjEtLjI1Ny42NTctLjM2NVpNMTIuNSA5YS41LjUgMCAwIDEgLjUuNWMwIC40Mi4xMyAxLjA2MS41MDYgMS41ODMuMzU3LjQ5Ni45NTcuOTE3IDEuOTk0LjkxN2EuNS41IDAgMCAxIDAgMWMtMS4wMzcgMC0xLjYzNy40Mi0xLjk5NC45MTdBMi44NTIgMi44NTIgMCAwIDAgMTMgMTUuNWEuNS41IDAgMCAxLTEgMGMwLS40Mi0uMTMtMS4wNjEtLjUwNi0xLjU4My0uMzU3LS40OTYtLjk1Ny0uOTE3LTEuOTk0LS45MTdhLjUuNSAwIDAgMSAwLTFjMS4wMzcgMCAxLjYzNy0uNDIgMS45OTQtLjkxN0EyLjg1MiAyLjg1MiAwIDAgMCAxMiA5LjVhLjUuNSAwIDAgMSAuNS0uNVptLjE5NCAyLjY2N2MuMjMuMzIuNTI0LjYwNy44OS44MzNhMy4xIDMuMSAwIDAgMC0uODkuODMzIDMuNDIgMy40MiAwIDAgMC0uMTk0LjMwMiAzLjQyIDMuNDIgMCAwIDAtLjE5NC0uMzAyIDMuMSAzLjEgMCAwIDAtLjg5LS44MzMgMy4xIDMuMSAwIDAgMCAuODktLjgzM2MuMDctLjA5OS4xMzYtLjIuMTk0LS4zMDIuMDU5LjEwMi4xMjMuMjAzLjE5NC4zMDJaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-console::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiI+CiAgPGc+CiAgICA8cGF0aCBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xLjE1NzI1MDM4LDEyLjIyNDA0MjQgTDUuNzY4Mjc0MjgsOC4zMjAxOTk3OSBDNS45Nzg2MTMwOCw4LjE0MjEyMDEzIDUuOTc5MTQwOTUsNy44NTgzMjY3OCA1Ljc2ODI3NDI4LDcuNjc5ODAwMjEgTDEuMTU3MjUwMzgsMy43NzU5NTc2MyBDMC45NDc1ODMyMDYsMy41OTg0NDY1OSAwLjk0NzU4MzIwNiwzLjMxMDY0NDMyIDEuMTU3MjUwMzgsMy4xMzMxMzMyOCBDMS4zNjY5MTc1NiwyLjk1NTYyMjI0IDEuNzA2ODU1MjIsMi45NTU2MjIyNCAxLjkxNjUyMjQsMy4xMzMxMzMyOCBMNi41Mjc1NDYyOSw3LjAzNjk3NTg2IEM3LjE1ODI4MzU3LDcuNTcwOTc4NTMgNy4xNTY2ODUwNiw4LjQzMDM3NDgyIDYuNTI3NTQ2MjksOC45NjMwMjQxNCBMMS45MTY1MjI0LDEyLjg2Njg2NjcgQzEuNzA2ODU1MjIsMTMuMDQ0Mzc3OCAxLjM2NjkxNzU2LDEzLjA0NDM3NzggMS4xNTcyNTAzOCwxMi44NjY4NjY3IEMwLjk0NzU4MzIwNiwxMi42ODkzNTU3IDAuOTQ3NTgzMjA2LDEyLjQwMTU1MzQgMS4xNTcyNTAzOCwxMi4yMjQwNDI0IFogTTksMTIgTDE1LDEyIEwxNSwxMyBMOSwxMyBMOSwxMiBaIi8+CiAgPC9nPgo8L3N2Zz4K");
          background-size: contain;
          background-repeat: no-repeat;
        }
        
        .connector-inline-highlight.connector-http::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEpIj4KICAgIDxwYXRoIGZpbGw9IiNDNzNBNjMiIGQ9Ik0xNC45NDI1LDEyLjU2Mjg3NSBDMTMuNjE2MjUsMTQuNzkyMzc1IDEyLjM0NTYyNSwxNi45NTEzNzUgMTEuMDQ4NSwxOS4wOTQxMjUgQzEwLjcxNTM3NSwxOS42NDQyNSAxMC41NTA1LDIwLjA5MjM3NSAxMC44MTY2MjUsMjAuNzkxNjI1IEMxMS41NTEzNzUsMjIuNzIzMzc1IDEwLjUxNDg3NSwyNC42MDMyNSA4LjU2Njg3NSwyNS4xMTM1IEM2LjcyOTc1LDI1LjU5NDg3NSA0LjkzOTg3NSwyNC4zODc1IDQuNTc1Mzc1LDIyLjQyMDYyNSBDNC4yNTIzNzUsMjAuNjc5NzUgNS42MDMzNzUsMTguOTczMTI1IDcuNTIyODc1LDE4LjcwMSBDNy42ODM2MjUsMTguNjc4IDcuODQ3ODc1LDE4LjY3NTM3NSA4LjExODEyNSwxOC42NTUxMjUgTDExLjAzNzg3NSwxMy43NTkxMjUgQzkuMjAxNSwxMS45MzMxMjUgOC4xMDg1LDkuNzk4NzUgOC4zNTAzNzUsNy4xNTM3NSBDOC41MjEzNzUsNS4yODQxMjUgOS4yNTY2MjUsMy42NjgzNzUgMTAuNjAwMzc1LDIuMzQ0MTI1IEMxMy4xNzQxMjUsLTAuMTkxODc1IDE3LjEwMDYyNSwtMC42MDI1IDIwLjEzMTEyNSwxLjM0NCBDMjMuMDQxNjI1LDMuMjEzNzUgMjQuMzc0NjI1LDYuODU1NzUgMjMuMjM4Mzc1LDkuOTcyODc1IEMyMi4zODE2MjUsOS43NDA2MjUgMjEuNTE4ODc1LDkuNTA2Mzc1IDIwLjU3MDUsOS4yNDkxMjUgQzIwLjkyNzI1LDcuNTE2IDIwLjY2MzM3NSw1Ljk1OTc1IDE5LjQ5NDUsNC42MjY1IEMxOC43MjIyNSwzLjc0NjI1IDE3LjczMTI1LDMuMjg0ODc1IDE2LjYwNDUsMy4xMTQ4NzUgQzE0LjM0NTUsMi43NzM2MjUgMTIuMTI3NjI1LDQuMjI0ODc1IDExLjQ2OTUsNi40NDIxMjUgQzEwLjcyMjUsOC45NTgzNzUgMTEuODUzMTI1LDExLjAxNCAxNC45NDI1LDEyLjU2MyBMMTQuOTQyNSwxMi41NjI4NzUgWiIvPgogICAgPHBhdGggZmlsbD0iIzRCNEI0QiIgZD0iTTE4LjczMDEyNSw5LjkyNjI1IEMxOS42NjQ1LDExLjU3NDYyNSAyMC42MTMyNSwxMy4yNDc4NzUgMjEuNTUzNSwxNC45MDU3NSBDMjYuMzA2LDEzLjQzNTM3NSAyOS44ODkyNSwxNi4wNjYyNSAzMS4xNzQ3NSwxOC44ODI4NzUgQzMyLjcyNzUsMjIuMjg1MjUgMzEuNjY2LDI2LjMxNSAyOC42MTY2MjUsMjguNDE0MTI1IEMyNS40ODY2MjUsMzAuNTY4ODc1IDIxLjUyODI1LDMwLjIwMDc1IDE4Ljc1NTEyNSwyNy40MzI3NSBDMTkuNDYxODc1LDI2Ljg0MTEyNSAyMC4xNzIxMjUsMjYuMjQ2ODc1IDIwLjkzMSwyNS42MTIgQzIzLjY3LDI3LjM4NiAyNi4wNjU2MjUsMjcuMzAyNSAyNy44NDQxMjUsMjUuMjAxNzUgQzI5LjM2MDc1LDIzLjQwOTYyNSAyOS4zMjc4NzUsMjAuNzM3NSAyNy43NjcyNSwxOC45ODMgQzI1Ljk2NjI1LDE2Ljk1ODM3NSAyMy41NTM4NzUsMTYuODk2NjI1IDIwLjYzNzg3NSwxOC44NDAxMjUgQzE5LjQyODI1LDE2LjY5NDEyNSAxOC4xOTc2MjUsMTQuNTY1MjUgMTcuMDI2MjUsMTIuNDAzNzUgQzE2LjYzMTI1LDExLjY3NTI1IDE2LjE5NTI1LDExLjI1MjUgMTUuMzA1LDExLjA5ODM3NSBDMTMuODE4Mzc1LDEwLjg0MDYyNSAxMi44NTg2MjUsOS41NjQgMTIuODAxLDguMTMzNzUgQzEyLjc0NDM3NSw2LjcxOTI1IDEzLjU3Nzc1LDUuNDQwNjI1IDE0Ljg4MDI1LDQuOTQyNSBDMTYuMTcwNSw0LjQ0ODg3NSAxNy42ODQ2MjUsNC44NDcyNSAxOC41NTI1LDUuOTQ0MjUgQzE5LjI2MTc1LDYuODQwNSAxOS40ODcxMjUsNy44NDkyNSAxOS4xMTM4NzUsOC45NTQ2MjUgQzE5LjAxMDEyNSw5LjI2Mjg3NSAxOC44NzU3NSw5LjU2MTEyNSAxOC43MzAxMjUsOS45MjYzNzUgTDE4LjczMDEyNSw5LjkyNjI1IFoiLz4KICAgIDxwYXRoIGZpbGw9IiM0QTRBNEEiIGQ9Ik0yMC45NjMzNzUsMjMuNDAxMjUgTDE1LjI0MjEyNSwyMy40MDEyNSBDMTQuNjkzNzUsMjUuNjU2NzUgMTMuNTA5MjUsMjcuNDc3NzUgMTEuNDY4Mzc1LDI4LjYzNTc1IEM5Ljg4MTc1LDI5LjUzNTc1IDguMTcxNzUsMjkuODQwODc1IDYuMzUxNzUsMjkuNTQ3IEMzLjAwMDc1LDI5LjAwNjYyNSAwLjI2MDc1LDI1Ljk5IDAuMDE5NSwyMi41OTMyNSBDLTAuMjUzNSwxOC43NDUyNSAyLjM5MTM3NSwxNS4zMjQ4NzUgNS45MTY3NSwxNC41NTY2MjUgQzYuMTYwMTI1LDE1LjQ0MDUgNi40MDYxMjUsMTYuMzMyODc1IDYuNjQ5NSwxNy4yMTQ2MjUgQzMuNDE1LDE4Ljg2NDg3NSAyLjI5NTUsMjAuOTQ0MTI1IDMuMjAwNzUsMjMuNTQ0MTI1IEMzLjk5NzYyNSwyNS44MzIxMjUgNi4yNjEyNSwyNy4wODYyNSA4LjcxOTEyNSwyNi42MDEyNSBDMTEuMjI5MTI1LDI2LjEwNiAxMi40OTQ2MjUsMjQuMDIgMTIuMzQwMTI1LDIwLjY3MjI1IEMxNC43MTk2MjUsMjAuNjcyMjUgMTcuMTAxMTI1LDIwLjY0NzYyNSAxOS40ODA4NzUsMjAuNjg0Mzc1IEMyMC40MTAxMjUsMjAuNjk5IDIxLjEyNzUsMjAuNjAyNjI1IDIxLjgyNzUsMTkuNzgzMzc1IEMyMi45OCwxOC40MzUzNzUgMjUuMTAxMzc1LDE4LjU1NyAyNi4zNDI2MjUsMTkuODMwMTI1IEMyNy42MTExMjUsMjEuMTMxMjUgMjcuNTUwMzc1LDIzLjIyNDc1IDI2LjIwOCwyNC40NzEgQzI0LjkxMjg3NSwyNS42NzM1IDIyLjg2Njc1LDI1LjYwOTI1IDIxLjY1NSwyNC4zMTM1IEMyMS40MDYsMjQuMDQ2NSAyMS4yMDk3NSwyMy43MjkzNzUgMjAuOTYzMzc1LDIzLjQwMTI1IFoiLz4KICA8L2c+Cjwvc3ZnPgo=");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-foreach::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yIDhhNS45OCA1Ljk4IDAgMCAwIDEuNzU3IDQuMjQzQTUuOTggNS45OCAwIDAgMCA4IDE0djFhNi45OCA2Ljk4IDAgMCAxLTQuOTUtMi4wNUE2Ljk4IDYuOTggMCAwIDEgMSA4YzAtMS43OS42ODMtMy41OCAyLjA0OC00Ljk0N2wuMDA0LS4wMDQuMDE5LS4wMkwzLjEgM0gxVjJoNHY0SDRWMy41MjVhNi41MSA2LjUxIDAgMCAwLS4yMi4yMWwtLjAxMy4wMTMtLjAwMy4wMDItLjAwNy4wMDdBNS45OCA1Ljk4IDAgMCAwIDIgOFptMTAuMjQzLTQuMjQzQTUuOTggNS45OCAwIDAgMCA4IDJWMWE2Ljk4IDYuOTggMCAwIDEgNC45NSAyLjA1QTYuOTggNi45OCAwIDAgMSAxNSA4YTYuOTggNi45OCAwIDAgMS0yLjA0NyA0Ljk0N2wtLjAwNS4wMDQtLjAxOC4wMi0uMDMuMDI5SDE1djFoLTR2LTRoMXYyLjQ3NWE2Ljc0NCA2Ljc0NCAwIDAgMCAuMjItLjIxbC4wMTMtLjAxMy4wMDMtLjAwMi4wMDctLjAwN0E1Ljk4IDUuOTggMCAwIDAgMTQgOGE1Ljk4IDUuOTggMCAwIDAtMS43NTctNC4yNDNaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-if::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNSwxMC4wMzc3MTg4IEM1LjYzNTI1ODUyLDkuMzg5NDQzNzcgNi41MjA2NTU5MSw4Ljk4NzIxMDE2IDcuNSw4Ljk4NzIxMDE2IEw5LjUsOC45ODcyMTAxNiBDMTAuNzMwNzc2NSw4Ljk4NzIxMDE2IDExLjc1MzgyNCw4LjA5NzgxNjE1IDExLjk2MTUwMTMsNi45MjY2NjkxNiBDMTEuMTE4NDg5Miw2LjY5MTU0NjExIDEwLjUsNS45MTgwMDA5OSAxMC41LDUgQzEwLjUsMy44OTU0MzA1IDExLjM5NTQzMDUsMyAxMi41LDMgQzEzLjYwNDU2OTUsMyAxNC41LDMuODk1NDMwNSAxNC41LDUgQzE0LjUsNS45NDI1NDI2MiAxMy44NDc5OTk3LDYuNzMyODAyNDEgMTIuOTcwNDE0Miw2Ljk0NDM2NDM4IEMxMi43NDY0MzcxLDguNjYxMzUwMDIgMTEuMjc4MDU0Miw5Ljk4NzIxMDE2IDkuNSw5Ljk4NzIxMDE2IEw3LjUsOS45ODcyMTAxNiBDNi4yNjA2ODU5Miw5Ljk4NzIxMDE2IDUuMjMxOTkyODYsMTAuODg4OTg1OSA1LjAzNDI5NDgxLDEyLjA3MjE2MzMgQzUuODc5NDUzODgsMTIuMzA1ODgzOCA2LjUsMTMuMDgwNDczNyA2LjUsMTQgQzYuNSwxNS4xMDQ1Njk1IDUuNjA0NTY5NSwxNiA0LjUsMTYgQzMuMzk1NDMwNSwxNiAyLjUsMTUuMTA0NTY5NSAyLjUsMTQgQzIuNSwxMy4wNjgwODAzIDMuMTM3Mzg2MzksMTIuMjg1MDMwMSA0LDEyLjA2MzAwODcgTDQsMy45MzY5OTEyNiBDMy4xMzczODYzOSwzLjcxNDk2OTg2IDIuNSwyLjkzMTkxOTcxIDIuNSwyIEMyLjUsMC44OTU0MzA1IDMuMzk1NDMwNSwwIDQuNSwwIEM1LjYwNDU2OTUsMCA2LjUsMC44OTU0MzA1IDYuNSwyIEM2LjUsMi45MzE5MTk3MSA1Ljg2MjYxMzYxLDMuNzE0OTY5ODYgNSwzLjkzNjk5MTI2IEw1LDEwLjAzNzcxODggWiBNNC41LDMgQzUuMDUyMjg0NzUsMyA1LjUsMi41NTIyODQ3NSA1LjUsMiBDNS41LDEuNDQ3NzE1MjUgNS4wNTIyODQ3NSwxIDQuNSwxIEMzLjk0NzcxNTI1LDEgMy41LDEuNDQ3NzE1MjUgMy41LDIgQzMuNSwyLjU1MjI4NDc1IDMuOTQ3NzE1MjUsMyA0LjUsMyBaIE00LjUsMTUgQzUuMDUyMjg0NzUsMTUgNS41LDE0LjU1MjI4NDcgNS41LDE0IEM1LjUsMTMuNDQ3NzE1MyA1LjA1MjI4NDc1LDEzIDQuNSwxMyBDMy45NDc3MTUyNSwxMyAzLjUsMTMuNDQ3NzE1MyAzLjUsMTQgQzMuNSwxNC41NTIyODQ3IDMuOTQ3NzE1MjUsMTUgNC41LDE1IFogTTEyLjUsNiBDMTMuMDUyMjg0Nyw2IDEzLjUsNS41NTIyODQ3NSAxMy41LDUgQzEzLjUsNC40NDc3MTUyNSAxMy4wNTIyODQ3LDQgMTIuNSw0IEMxMS45NDc3MTUzLDQgMTEuNSw0LjQ0NzcxNTI1IDExLjUsNSBDMTEuNSw1LjU1MjI4NDc1IDExLjk0NzcxNTMsNiAxMi41LDYgWiIvPgo8L3N2Zz4K");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-parallel::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNSAyYTEgMSAwIDAwLTEgMXYxMGExIDEgMCAxMDIgMFYzYTEgMSAwIDAwLTEtMXptNiAwYTEgMSAwIDAwLTEgMXYxMGExIDEgMCAxMDIgMFYzYTEgMSAwIDAwLTEtMXoiIC8+Cjwvc3ZnPg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-merge::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMC4zNTQgOC4zNTQgMTQuMjA3IDQuNSAxMC4zNTMuNjQ2bC0uNzA3LjcwOEwxMi4yOTMgNEgydjFoMTAuMjkzTDkuNjQ2IDcuNjQ2bC43MDcuNzA4Wm0tNC43MDcgN0wxLjc5MyAxMS41bDMuODU0LTMuODU0LjcwNy43MDhMMy43MDcgMTFIMTR2MUgzLjcwN2wyLjY0NyAyLjY0Ni0uNzA3LjcwOFoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPgo8L3N2Zz4K");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-wait::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNOC41IDcuNVY0aC0xdjQuNUgxMnYtMUg4LjVaIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTUgOEE3IDcgMCAxIDEgMSA4YTcgNyAwIDAgMSAxNCAwWm0tMSAwQTYgNiAwIDEgMSAyIDhhNiA2IDAgMCAxIDEyIDBaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        /* Trigger type decorations */
        .trigger-inline-highlight {
          background-color: rgba(0, 191, 179, 0.12) !important;
          border-radius: 3px !important;
          padding: 1px 3px !important;
          box-shadow: 0 1px 2px rgba(0, 191, 179, 0.15) !important;
        }
        
        .trigger-inline-highlight::after {
          content: '';
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-left: 4px;
          vertical-align: middle;
          position: relative;
          top: -1px;
        }

        .trigger-inline-highlight.trigger-alert {
          background-color: rgba(240, 78, 152, 0.12) !important;
          box-shadow: 0 1px 2px rgba(240, 78, 152, 0.2) !important;
        }

        .trigger-inline-highlight.trigger-scheduled {
          background-color: rgba(255, 193, 7, 0.12) !important;
          box-shadow: 0 1px 2px rgba(255, 193, 7, 0.2) !important;
        }

        .trigger-inline-highlight.trigger-manual {
          background-color: rgba(108, 117, 125, 0.12) !important;
          box-shadow: 0 1px 2px rgba(108, 117, 125, 0.2) !important;
        }

        .trigger-inline-highlight.trigger-alert::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik04LjIyIDEuNzU0YS4yNS4yNSAwIDAgMC0uNDQgMEwxLjY5OCAxMy4xMzJhLjI1LjI1IDAgMCAwIC4yMi4zNjhoMTIuMTY0YS4yNS4yNSAwIDAgMCAuMjItLjM2OEw4LjIyIDEuNzU0Wk03LjI1IDVhLjc1Ljc1IDAgMCAxIDEuNSAwdjIuNWEuNzUuNzUgMCAwIDEtMS41IDBWNTJNOCA5LjVhMSAxIDAgMSAwIDAgMiAxIDEgMCAwIDAgMC0yWiIgY2xpcC1ydWxlPSJldmVub2RkIiBmaWxsPSIjRjA0RTk4Ii8+Cjwvc3ZnPgo=");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .trigger-inline-highlight.trigger-scheduled::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNOC41IDcuNVY0aC0xdjQuNUgxMnYtMUg4LjVaIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTUgOEE3IDcgMCAxIDEgMSA4YTcgNyAwIDAgMSAxNCAwWm0tMSAwQTYgNiAwIDEgMSAyIDhhNiA2IDAgMCAxIDEyIDBaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .trigger-inline-highlight.trigger-manual::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zLjI5MyA5LjI5MyA0IDEwbC0xIDRoMTBsLTEtNCAuNzA3LS43MDdhMSAxIDAgMCAxIC4yNjMuNDY0bDEgNEExIDEgMCAwIDEgMTMgMTVIM2ExIDEgMCAwIDEtLjk3LTEuMjQybDEtNGExIDEgMCAwIDEgLjI2My0uNDY1Wk04IDljMyAwIDQgMSA0IDEgLjcwNy0uNzA3LjcwNi0uNzA4LjcwNi0uNzA4bC0uMDAxLS4wMDEtLjAwMi0uMDAyLS4wMDUtLjAwNS0uMDEtLjAxYTEuNzk4IDEuNzk4IDAgMCAwLS4xMDEtLjA4OSAyLjkwNyAyLjkwNyAwIDAgMC0uMjM1LS4xNzMgNC42NiA0LjY2IDAgMCAwLS44NTYtLjQ0IDcuMTEgNy4xMSAwIDAgMC0xLjEzNi0uMzQyIDQgNCAwIDEgMC00LjcyIDAgNy4xMSA3LjExIDAgMCAwLTEuMTM2LjM0MiA0LjY2IDQuNjYgMCAwIDAtLjg1Ni40NCAyLjkwOSAyLjkwOSAwIDAgMC0uMzM1LjI2MmwtLjAxMS4wMS0uMDA1LjAwNS0uMDAyLjAwMmgtLjAwMVMzLjI5MyA5LjI5NCA0IDEwYzAgMCAxLTEgNC0xWm0wLTFhMyAzIDAgMSAwIDAtNiAzIDMgMCAwIDAgMCA2WiIgY2xpcC1ydWxlPSJldmVub2RkIi8+Cjwvc3ZnPgo=");
          background-size: contain;
          background-repeat: no-repeat;
        }

        /* After content icons */
        .connector-decoration {
          margin-left: 4px;
          opacity: 0.7;
          font-size: 14px;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      // Cleanup: remove the style when component unmounts
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [euiTheme]);

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
        minWordLength: 1, // Show suggestions after 1 character
        filterGraceful: true, // Better filtering
        localityBonus: true, // Prioritize matches near cursor
      },
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

  const styles = useMemoCss(componentStyles);

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
    <div css={styles.container} ref={containerRef}>
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
      <EuiFlexGroup
        className="elasticsearch-step-actions"
        gutterSize="xs"
        responsive={false}
        style={editorActionsCss}
        justifyContent="center"
        alignItems="center"
      >
        <EuiFlexItem
          grow={false}
          css={{ marginTop: euiTheme.size.xs, marginRight: euiTheme.size.xs }}
        >
          <ElasticsearchStepActions
            actionsProvider={unifiedProvidersRef.current?.actions}
            http={http}
            notifications={notifications as any}
            esHost={esHost}
            kibanaHost={kibanaHost}
            onStepActionClicked={onStepActionClicked}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
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
                    const zodSchema = getWorkflowZodSchema();
                    const jsonSchema = getJsonSchemaFromYamlSchema(zodSchema);

                    const blob = new Blob([JSON.stringify(jsonSchema, null, 2)], {
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
            navigateToErrorPosition(editorRef.current, error.lineNumber, error.column);
          }}
          rightSide={<WorkflowYAMLEditorShortcuts />}
        />
      </div>
    </div>
  );
};

const componentStyles = {
  actionsMenuPopoverPanel: css({
    minInlineSize: '600px',
  }),
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      minHeight: 0,
      // css classes for the monaco editor
      '.template-variable-valid': {
        backgroundColor: transparentize(euiTheme.colors.primary, 0.12),
        borderRadius: '2px',
      },
      '.template-variable-error': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        color: euiTheme.colors.severity.danger,
        borderRadius: '2px',
      },
      '.step-highlight': {
        backgroundColor: euiTheme.colors.backgroundBaseAccent,
        borderRadius: '2px',
      },
      '.dimmed': {
        opacity: 0.5,
      },
      '.step-execution-skipped': {
        backgroundColor: euiTheme.colors.backgroundBaseFormsControlDisabled,
      },
      '.step-execution-waiting_for_input': {
        backgroundColor: euiTheme.colors.backgroundLightWarning,
      },
      '.step-execution-running': {
        backgroundColor: euiTheme.colors.backgroundLightPrimary,
      },
      '.step-execution-completed': {
        backgroundColor: euiTheme.colors.backgroundLightSuccess,
      },
      '.step-execution-failed': {
        backgroundColor: euiTheme.colors.backgroundLightDanger,
      },
      '.step-execution-skipped-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.backgroundFilledText,
          borderRadius: '50%',
        },
      },
      // Enhanced Monaco hover styling for better readability - EXCLUDE glyph and contrib widgets
      // Only target our custom hover widgets, not Monaco's internal ones (especially glyph hovers)
      '&, & .monaco-editor, & .monaco-hover:not([class*="contrib"]):not([class*="glyph"]), & .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"])':
        {
          '--hover-width': '600px',
          '--hover-min-width': '500px',
          '--hover-max-width': '800px',
          '--hover-max-height': '600px',
        },
      '.monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]), .monaco-hover:not([class*="contrib"]):not([class*="glyph"])':
        {
          width: '600px',
          minWidth: '500px',
          maxWidth: '800px',
          maxHeight: '400px',
          fontSize: '13px',
          zIndex: 999, // Lower than Monaco's internal widgets
        },
      '.monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]) .monaco-hover-content':
        {
          width: '100%',
          minWidth: '500px',
          maxWidth: '800px',
          padding: '12px 16px',
        },
      '.monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]) .hover-contents':
        {
          width: '100%',
          minWidth: '500px',
          maxWidth: '800px',
        },
      // Ensure Monaco's internal glyph hover widgets work properly
      '& [class*="modesGlyphHoverWidget"], & [class*="glyph"][class*="hover"]': {
        display: 'block',
        visibility: 'visible',
      },
      '.monaco-editor .monaco-editor-hover .markdown-docs': {
        width: '100%',
        minWidth: '500px',
        maxWidth: '800px',
        flex: '1',
        overflowY: 'auto',
        overflowX: 'hidden',
      },
      '.monaco-editor .monaco-editor-hover h2': {
        fontSize: '16px !important',
        fontWeight: 600,
        marginBottom: '8px !important',
        color: euiTheme.colors.primaryText,
      },
      '.monaco-editor .monaco-editor-hover h3': {
        fontSize: '14px !important',
        fontWeight: 600,
        marginTop: '16px !important',
        marginBottom: '8px !important',
        color: euiTheme.colors.primaryText,
      },
      '.monaco-editor .monaco-editor-hover a': {
        color: euiTheme.colors.primary,
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'underline',
        },
      },
      '.monaco-editor .monaco-editor-hover code': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        padding: '2px 4px',
        borderRadius: '3px',
        fontSize: '12px',
      },
      '.monaco-editor .monaco-editor-hover pre': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        overflow: 'auto',
        maxHeight: '120px',
      },
      '.step-execution-waiting_for_input-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.backgroundFilledWarning,
          borderRadius: '50%',
        },
      },
      '.step-execution-running-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.backgroundFilledPrimary,
          borderRadius: '50%',
        },
      },
      '.step-execution-completed-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.vis.euiColorVis0,
          borderRadius: '50%',
        },
      },
      '.step-execution-failed-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.danger,
          borderRadius: '50%',
        },
      },
      '.alert-trigger-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.warning,
          borderRadius: '50%',
        },
      },
      '.alert-trigger-highlight': {
        backgroundColor: euiTheme.colors.backgroundLightWarning,
      },
      '.duplicate-step-name-error': {
        backgroundColor: euiTheme.colors.backgroundLightDanger,
      },
      '.duplicate-step-name-error-margin': {
        backgroundColor: euiTheme.colors.backgroundLightDanger,
        // Use a solid background to completely cover the line numbers
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: euiTheme.colors.backgroundLightDanger,
          zIndex: 1000,
        },
        // Make the text invisible as backup
        color: 'transparent',
        textShadow: 'none',
        fontSize: 0,
      },
      '.elasticsearch-step-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.vis.euiColorVis1,
          borderRadius: '50%',
        },
      },
      '.elasticsearch-step-type-highlight': {
        backgroundColor: 'rgba(0, 120, 212, 0.1)',
        borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
      },
      '.elasticsearch-step-block-highlight': {
        backgroundColor: 'rgba(0, 120, 212, 0.08)',
        borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
      },
      '.elasticsearch-step-background': {
        backgroundColor: 'rgba(0, 120, 212, 0.08)',
        borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
      },
      '.workflow-step-highlight': {
        backgroundColor: 'rgba(0, 120, 212, 0.1)',
        borderLeft: `3px solid ${euiTheme.colors.vis.euiColorVis1}`,
      },
      '.workflow-step-line-highlight': {
        backgroundColor: 'rgba(0, 120, 212, 0.05)',
        borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
      },
      // Dev Console-style step highlighting (block border approach)
      '.workflow-step-selected-single': {
        backgroundColor: 'rgba(0, 120, 212, 0.02)',
        border: `1px solid #0078d4`, // Explicit blue color
        borderLeft: `1px solid #0078d4`, // Explicit blue color
        borderRadius: '3px',
        boxShadow: `0 1px 3px rgba(0, 120, 212, 0.1)`,
        position: 'relative', // Enable relative positioning for action buttons
      },
      '.workflow-step-selected-first': {
        backgroundColor: 'rgba(0, 120, 212, 0.02)',
        borderTop: `1px solid #0078d4`, // Explicit blue color
        borderLeft: `1px solid #0078d4`, // Explicit blue color
        borderRight: `1px solid #0078d4`, // Explicit blue color
        borderTopLeftRadius: '3px',
        borderTopRightRadius: '3px',
        position: 'relative', // Enable relative positioning for action buttons
      },
      '.workflow-step-selected-middle': {
        backgroundColor: 'rgba(0, 120, 212, 0.02)',
        borderLeft: `1px solid #0078d4`, // Left border to connect with first/last
        borderRight: `1px solid #0078d4`, // Right border to connect with first/last
      },
      '.workflow-step-selected-last': {
        backgroundColor: 'rgba(0, 120, 212, 0.02)',
        borderBottom: `1px solid #0078d4`, // Explicit blue color
        borderLeft: `1px solid #0078d4`, // Explicit blue color
        borderRight: `1px solid #0078d4`, // Explicit blue color
        borderBottomLeftRadius: '3px',
        borderBottomRightRadius: '3px',
        boxShadow: `0 1px 3px rgba(0, 120, 212, 0.1)`,
      },

      // Custom icons for Monaco autocomplete (SUGGESTIONS)
      // Slack
      '.codicon-symbol-event:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIj4KICAgIDxwYXRoIGZpbGw9IiNFMDFFNUEiIGQ9Ik02LjgxMjkwMzIzIDMuNDA2NDUxNjFDNi44MTI5MDMyMyA1LjIzODcwOTY4IDUuMzE2MTI5MDMgNi43MzU0ODM4NyAzLjQ4Mzg3MDk3IDYuNzM1NDgzODcgMS42NTE2MTI5IDYuNzM1NDgzODcuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSAzLjQwNjQ1MTYxLjE1NDgzODcxIDEuNTc0MTkzNTUgMS42NTE2MTI5LjA3NzQxOTM1NDggMy40ODM4NzA5Ny4wNzc0MTkzNTQ4TDYuODEyOTAzMjMuMDc3NDE5MzU0OCA2LjgxMjkwMzIzIDMuNDA2NDUxNjF6TTguNDkwMzIyNTggMy40MDY0NTE2MUM4LjQ5MDMyMjU4IDEuNTc0MTkzNTUgOS45ODcwOTY3Ny4wNzc0MTkzNTQ4IDExLjgxOTM1NDguMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEgMy40MDY0NTE2MUwxNS4xNDgzODcxIDExLjc0MTkzNTVDMTUuMTQ4Mzg3MSAxMy41NzQxOTM1IDEzLjY1MTYxMjkgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgOS45ODcwOTY3NyAxNS4wNzA5Njc3IDguNDkwMzIyNTggMTMuNTc0MTkzNSA4LjQ5MDMyMjU4IDExLjc0MTkzNTVMOC40OTAzMjI1OCAzLjQwNjQ1MTYxeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAxNi43NzQpIi8+CiAgICA8cGF0aCBmaWxsPSIjMzZDNUYwIiBkPSJNMTEuODE5MzU0OCA2LjgxMjkwMzIzQzkuOTg3MDk2NzcgNi44MTI5MDMyMyA4LjQ5MDMyMjU4IDUuMzE2MTI5MDMgOC40OTAzMjI1OCAzLjQ4Mzg3MDk3IDguNDkwMzIyNTggMS42NTE2MTI5IDkuOTg3MDk2NzcuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSAxMy42NTE2MTI5LjE1NDgzODcxIDE1LjE0ODM4NzEgMS42NTE2MTI5IDE1LjE0ODM4NzEgMy40ODM4NzA5N0wxNS4xNDgzODcxIDYuODEyOTAzMjMgMTEuODE5MzU0OCA2LjgxMjkwMzIzek0xMS44MTkzNTQ4IDguNDkwMzIyNThDMTMuNjUxNjEyOSA4LjQ5MDMyMjU4IDE1LjE0ODM4NzEgOS45ODcwOTY3NyAxNS4xNDgzODcxIDExLjgxOTM1NDggMTUuMTQ4Mzg3MSAxMy42NTE2MTI5IDEzLjY1MTYxMjkgMTUuMTQ4Mzg3MSAxMS44MTkzNTQ4IDE1LjE0ODM4NzFMMy40ODM4NzA5NyAxNS4xNDgzODcxQzEuNjUxNjEyOSAxNS4xNDgzODcxLjE1NDgzODcxIDEzLjY1MTYxMjkuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSA5Ljk4NzA5Njc3IDEuNjUxNjEyOSA4LjQ5MDMyMjU4IDMuNDgzODcwOTcgOC40OTAzMjI1OEwxMS44MTkzNTQ4IDguNDkwMzIyNTh6Ii8+CiAgICA8cGF0aCBmaWxsPSIjMkVCNjdEIiBkPSJNOC40MTI5MDMyMyAxMS44MTkzNTQ4QzguNDEyOTAzMjMgOS45ODcwOTY3NyA5LjkwOTY3NzQyIDguNDkwMzIyNTggMTEuNzQxOTM1NSA4LjQ5MDMyMjU4IDEzLjU3NDE5MzUgOC40OTAzMjI1OCAxNS4wNzA5Njc3IDkuOTg3MDk2NzcgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgMTMuNjUxNjEyOSAxMy41NzQxOTM1IDE1LjE0ODM4NzEgMTEuNzQxOTM1NSAxNS4xNDgzODcxTDguNDEyOTAzMjMgMTUuMTQ4Mzg3MSA4LjQxMjkwMzIzIDExLjgxOTM1NDh6TTYuNzM1NDgzODcgMTEuODE5MzU0OEM2LjczNTQ4Mzg3IDEzLjY1MTYxMjkgNS4yMzg3MDk2OCAxNS4xNDgzODcxIDMuNDA2NDUxNjEgMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEuMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTEuODE5MzU0OEwuMDc3NDE5MzU0OCAzLjQ4Mzg3MDk3Qy4wNzc0MTkzNTQ4IDEuNjUxNjEyOSAxLjU3NDE5MzU1LjE1NDgzODcxIDMuNDA2NDUxNjEuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSA2LjczNTQ4Mzg3IDEuNjUxNjEyOSA2LjczNTQ4Mzg3IDMuNDgzODcwOTdMNi43MzU0ODM4NyAxMS44MTkzNTQ4eiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTYuNzc0KSIvPgogICAgPHBhdGggZmlsbD0iI0VDQjIyRSIgZD0iTTMuNDA2NDUxNjEgOC40MTI5MDMyM0M1LjIzODcwOTY4IDguNDEyOTAzMjMgNi43MzU0ODM4NyA5LjkwOTY3NzQyIDYuNzM1NDgzODcgMTEuNzQxOTM1NSA2LjczNTQ4Mzg3IDEzLjU3NDE5MzUgNS4yMzg3MDk2OCAxNS4wNzA5Njc3IDMuNDA2NDUxNjEgMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcuMDc3NDE5MzU0OCAxMy41NzQxOTM1LjA3NzQxOTM1NDggMTEuNzQxOTM1NUwuMDc3NDE5MzU0OCA4LjQxMjkwMzIzIDMuNDA2NDUxNjEgOC40MTI5MDMyM3pNMy40MDY0NTE2MSA2LjczNTQ4Mzg3QzEuNTc0MTkzNTUgNi43MzU0ODM4Ny4wNzc0MTkzNTQ4IDUuMjM4NzA5NjguMDc3NDE5MzU0OCAzLjQwNjQ1MTYxLjA3NzQxOTM1NDggMS41NzQxOTM1NSAxLjU3NDE5MzU1LjA3NzQxOTM1NDggMy40MDY0NTE2MS4wNzc0MTkzNTQ4TDExLjc0MTkzNTUuMDc3NDE5MzU0OEMxMy41NzQxOTM1LjA3NzQxOTM1NDggMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcgMy40MDY0NTE2MSAxNS4wNzA5Njc3IDUuMjM4NzA5NjggMTMuNTc0MTkzNSA2LjczNTQ4Mzg3IDExLjc0MTkzNTUgNi43MzU0ODM4N0wzLjQwNjQ1MTYxIDYuNzM1NDgzODd6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi43NzQgMTYuNzc0KSIvPgogIDwvZz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },
      // Elasticsearch
      '.codicon-symbol-struct:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyBkYXRhLXR5cGU9ImxvZ29FbGFzdGljIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDMyIDMyIj4KPHBhdGggZD0iTTI3LjU2NDggMTEuMjQyNUMzMi42NjU0IDEzLjE4MiAzMi40MzczIDIwLjYzNzggMjcuMzE5NyAyMi4zNjk0TDI3LjE1NzYgMjIuNDI0MUwyNi45OTA2IDIyLjM4NTFMMjEuNzEwMyAyMS4xNDY4TDIxLjQ0MjcgMjEuMDg0M0wyMS4zMTU4IDIwLjg0MDFMMTkuOTE1NCAxOC4xNDk3TDE5LjY5ODYgMTcuNzMyN0wyMC4wNTExIDE3LjQyMjJMMjYuOTU1NCAxMS4zNTI4TDI3LjIyNjkgMTEuMTEzNkwyNy41NjQ4IDExLjI0MjVaIiBmaWxsPSIjMEI2NEREIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNMjIuMDQ3MiAyMS4yMzlMMjYuODQ3IDIyLjM2NEwyNy4xNjI1IDIyLjQzODJMMjcuMjczOCAyMi43NDE5TDI3LjMzOTIgMjIuOTMyNEMyNy45NjE1IDI0Ljg5NjIgMjcuMDc5NyAyNi43MTE3IDI1LjY4NjkgMjcuNzI5MkMyNC4yNTI4IDI4Ljc3NjcgMjIuMTc3NSAyOS4wNDg4IDIwLjUwNTIgMjcuNzUwN0wyMC4yMTUyIDI3LjUyNjFMMjAuMjgzNiAyNy4xNjQ4TDIxLjMyMDcgMjEuNzEwN0wyMS40Mzc5IDIxLjA5NjRMMjIuMDQ3MiAyMS4yMzlaIiBmaWxsPSIjOUFEQzMwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNNS4wMTA3NCA5LjYyOTk3TDEwLjI3NzMgMTAuODg0OUwxMC41NTk2IDEwLjk1MjJMMTAuNjgxNiAxMS4yMTU5TDExLjkxNyAxMy44NjUzTDEyLjEwMzUgMTQuMjY2N0wxMS43NzY0IDE0LjU2MzZMNS4wNDI5NyAyMC42NjQyTDQuNzcwNTEgMjAuOTEyMkw0LjQyNTc4IDIwLjc4MDRDMS45Mzg5IDE5LjgzMDMgMC43MjA0MDcgMTcuNDU1OCAwLjc1MTk1MyAxNS4xNTM0QzAuNzgzNjg2IDEyLjg0NTMgMi4wNzMwNSAxMC41MDk0IDQuNjgzNTkgOS42NDQ2Mkw0Ljg0NTcgOS41OTA5MUw1LjAxMDc0IDkuNjI5OTdaIiBmaWxsPSIjMUJBOUY1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNNi4yODEwMSA0LjMxOTgyQzcuNjk3MjMgMy4yMzk0IDkuNzYxMzUgMi45MzM0IDExLjUwMjcgNC4yNTE0NkwxMS43OTk2IDQuNDc3MDVMMTEuNzI5MiA0Ljg0MzI2TDEwLjY3NzUgMTAuMzE2OUwxMC41NTkzIDEwLjkzMjFMOS45NDk5NSAxMC43ODc2TDUuMTUwMTUgOS42NTA4OEw0LjgzMzc0IDkuNTc1NjhMNC43MjMzOSA5LjI3MDAyQzQuMDE1MDcgNy4zMDI5NSA0Ljg3MjYzIDUuMzk0MjkgNi4yODEwMSA0LjMxOTgyWiIgZmlsbD0iI0YwNEU5OCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KPHBhdGggZD0iTTEyLjQ2NjEgMTQuNDMzMUwxOS40OTYzIDE3LjY0NEwxOS42ODM4IDE3LjczTDE5Ljc3ODYgMTcuOTEyNkwyMS4zMzQyIDIwLjg5NzlMMjEuNDI5OSAyMS4wODI1TDIxLjM5MDkgMjEuMjg3NkwyMC4yMjQ5IDI3LjM4OTJMMjAuMjAxNCAyNy41MTEyTDIwLjEzMzEgMjcuNjEzOEMxNy40NTM0IDMxLjU3MiAxMy4yMzA1IDMyLjMyNDUgOS44NjQ1IDMwLjg3MzVDNi41MDkzMiAyOS40MjcyIDQuMDMwNyAyNS44MDQ0IDQuNzM5NSAyMS4xMzgyTDQuNzcxNzMgMjAuOTI3Mkw0LjkyOTkzIDIwLjc4MzdMMTEuODEzNyAxNC41MzQ3TDEyLjEwNjcgMTQuMjY5TDEyLjQ2NjEgMTQuNDMzMVoiIGZpbGw9IiMwMkJDQjciIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS4yIi8+CjxwYXRoIGQ9Ik0xMS44OTIzIDQuNDEwMjJDMTQuNDM4MSAwLjY3NjQyNiAxOC43NDEgMC4xMDUzMDMgMjIuMTMzNSAxLjUzOTEyQzI1LjUyNjMgMi45NzMwMiAyOC4xMjMxIDYuNDU5NzkgMjcuMjM2MSAxMC45MDI0TDI3LjE5NyAxMS4xMDE2TDI3LjA0MzcgMTEuMjM1NEwxOS45NzgzIDE3LjQ0ODNMMTkuNjg1MyAxNy43MDYxTDE5LjMzMTggMTcuNTQzTDEyLjMyOTggMTQuMzMyMUwxMi4xMjg3IDE0LjI0MDNMMTIuMDM0OSAxNC4wMzkxTDEwLjY1NSAxMS4wNTE4TDEwLjU3NCAxMC44NzUxTDEwLjYxMTEgMTAuNjg0NkwxMS43OTk2IDQuNjMyODdMMTEuODIzIDQuNTExNzhMMTEuODkyMyA0LjQxMDIyWiIgZmlsbD0iI0ZFQzUxNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KPC9zdmc+")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },
      // Kibana
      '.codicon-symbol-module:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQpIj4KICAgIDxwb2x5Z29uIGZpbGw9IiNGMDRFOTgiIHBvaW50cz0iMCAwIDAgMjguNzg5IDI0LjkzNSAuMDE3Ii8+CiAgICA8cGF0aCBjbGFzcz0iZXVpSWNvbl9fZmlsbE5lZ2F0aXZlIiBkPSJNMCwxMiBMMCwyOC43ODkgTDExLjkwNiwxNS4wNTEgQzguMzY4LDEzLjExNSA0LjMxNywxMiAwLDEyIi8+CiAgICA8cGF0aCBmaWxsPSIjMDBCRkIzIiBkPSJNMTQuNDc4NSwxNi42NjQgTDIuMjY3NSwzMC43NTQgTDEuMTk0NSwzMS45OTEgTDI0LjM4NjUsMzEuOTkxIEMyMy4xMzQ1LDI1LjY5OSAxOS41MDM1LDIwLjI3MiAxNC40Nzg1LDE2LjY2NCIvPgogIDwvZz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },
      // HTTP
      '.codicon-symbol-reference:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEpIj4KICAgIDxwYXRoIGZpbGw9IiNDNzNBNjMiIGQ9Ik0xNC45NDI1LDEyLjU2Mjg3NSBDMTMuNjE2MjUsMTQuNzkyMzc1IDEyLjM0NTYyNSwxNi45NTEzNzUgMTEuMDQ4NSwxOS4wOTQxMjUgQzEwLjcxNTM3NSwxOS42NDQyNSAxMC41NTA1LDIwLjA5MjM3NSAxMC44MTY2MjUsMjAuNzkxNjI1IEMxMS41NTEzNzUsMjIuNzIzMzc1IDEwLjUxNDg3NSwyNC42MDMyNSA4LjU2Njg3NSwyNS4xMTM1IEM2LjcyOTc1LDI1LjU5NDg3NSA0LjkzOTg3NSwyNC4zODc1IDQuNTc1Mzc1LDIyLjQyMDYyNSBDNC4yNTIzNzUsMjAuNjc5NzUgNS42MDMzNzUsMTguOTczMTI1IDcuNTIyODc1LDE4LjcwMSBDNy42ODM2MjUsMTguNjc4IDcuODQ3ODc1LDE4LjY3NTM3NSA4LjExODEyNSwxOC42NTUxMjUgTDExLjAzNzg3NSwxMy43NTkxMjUgQzkuMjAxNSwxMS45MzMxMjUgOC4xMDg1LDkuNzk4NzUgOC4zNTAzNzUsNy4xNTM3NSBDOC41MjEzNzUsNS4yODQxMjUgOS4yNTY2MjUsMy42NjgzNzUgMTAuNjAwMzc1LDIuMzQ0MTI1IEMxMy4xNzQxMjUsLTAuMTkxODc1IDE3LjEwMDYyNSwtMC42MDI1IDIwLjEzMTEyNSwxLjM0NCBDMjMuMDQxNjI1LDMuMjEzNzUgMjQuMzc0NjI1LDYuODU1NzUgMjMuMjM4Mzc1LDkuOTcyODc1IEMyMi4zODE2MjUsOS43NDA2MjUgMjEuNTE4ODc1LDkuNTA2Mzc1IDIwLjU3MDUsOS4yNDkxMjUgQzIwLjkyNzI1LDcuNTE2IDIwLjY2MzM3NSw1Ljk1OTc1IDE5LjQ5NDUsNC42MjY1IEMxOC43MjIyNSwzLjc0NjI1IDE3LjczMTI1LDMuMjg0ODc1IDE2LjYwNDUsMy4xMTQ4NzUgQzE0LjM0NTUsMi43NzM2MjUgMTIuMTI3NjI1LDQuMjI0ODc1IDExLjQ2OTUsNi40NDIxMjUgQzEwLjcyMjUsOC45NTgzNzUgMTEuODUzMTI1LDExLjAxNCAxNC45NDI1LDEyLjU2MyBMMTQuOTQyNSwxMi41NjI4NzUgWiIvPgogICAgPHBhdGggZmlsbD0iIzRCNEI0QiIgZD0iTTE4LjczMDEyNSw5LjkyNjI1IEMxOS42NjQ1LDExLjU3NDYyNSAyMC42MTMyNSwxMy4yNDc4NzUgMjEuNTUzNSwxNC45MDU3NSBDMjYuMzA2LDEzLjQzNTM3NSAyOS44ODkyNSwxNi4wNjYyNSAzMS4xNzQ3NSwxOC44ODI4NzUgQzMyLjcyNzUsMjIuMjg1MjUgMzEuNjY2LDI2LjMxNSAyOC42MTY2MjUsMjguNDE0MTI1IEMyNS40ODY2MjUsMzAuNTY4ODc1IDIxLjUyODI1LDMwLjIwMDc1IDE4Ljc1NTEyNSwyNy40MzI3NSBDMTkuNDYxODc1LDI2Ljg0MTEyNSAyMC4xNzIxMjUsMjYuMjQ2ODc1IDIwLjkzMSwyNS42MTIgQzIzLjY3LDI3LjM4NiAyNi4wNjU2MjUsMjcuMzAyNSAyNy44NDQxMjUsMjUuMjAxNzUgQzI5LjM2MDc1LDIzLjQwOTYyNSAyOS4zMjc4NzUsMjAuNzM3NSAyNy43NjcyNSwxOC45ODMgQzI1Ljk2NjI1LDE2Ljk1ODM3NSAyMy41NTM4NzUsMTYuODk2NjI1IDIwLjYzNzg3NSwxOC44NDAxMjUgQzE5LjQyODI1LDE2LjY5NDEyNSAxOC4xOTc2MjUsMTQuNTY1MjUgMTcuMDI2MjUsMTIuNDAzNzUgQzE2LjYzMTI1LDExLjY3NTI1IDE2LjE5NTI1LDExLjI1MjUgMTUuMzA1LDExLjA5ODM3NSBDMTMuODE4Mzc1LDEwLjg0MDYyNSAxMi44NTg2MjUsOS41NjQgMTIuODAxLDguMTMzNzUgQzEyLjc0NDM3NSw2LjcxOTI1IDEzLjU3Nzc1LDUuNDQwNjI1IDE0Ljg4MDI1LDQuOTQyNSBDMTYuMTcwNSw0LjQ0ODg3NSAxNy42ODQ2MjUsNC44NDcyNSAxOC41NTI1LDUuOTQ0MjUgQzE5LjI2MTc1LDYuODQwNSAxOS40ODcxMjUsNy44NDkyNSAxOS4xMTM4NzUsOC45NTQ2MjUgQzE5LjAxMDEyNSw5LjI2Mjg3NSAxOC44NzU3NSw5LjU2MTEyNSAxOC43MzAxMjUsOS45MjYzNzUgTDE4LjczMDEyNSw5LjkyNjI1IFoiLz4KICAgIDxwYXRoIGZpbGw9IiM0QTRBNEEiIGQ9Ik0yMC45NjMzNzUsMjMuNDAxMjUgTDE1LjI0MjEyNSwyMy40MDEyNSBDMTQuNjkzNzUsMjUuNjU2NzUgMTMuNTA5MjUsMjcuNDc3NzUgMTEuNDY4Mzc1LDI4LjYzNTc1IEM5Ljg4MTc1LDI5LjUzNTc1IDguMTcxNzUsMjkuODQwODc1IDYuMzUxNzUsMjkuNTQ3IEMzLjAwMDc1LDI5LjAwNjYyNSAwLjI2MDc1LDI1Ljk5IDAuMDE5NSwyMi41OTMyNSBDLTAuMjUzNSwxOC43NDUyNSAyLjM5MTM3NSwxNS4zMjQ4NzUgNS45MTY3NSwxNC41NTY2MjUgQzYuMTYwMTI1LDE1LjQ0MDUgNi40MDYxMjUsMTYuMzMyODc1IDYuNjQ5NSwxNy4yMTQ2MjUgQzMuNDE1LDE4Ljg2NDg3NSAyLjI5NTUsMjAuOTQ0MTI1IDMuMjAwNzUsMjMuNTQ0MTI1IEMzLjk5NzYyNSwyNS44MzIxMjUgNi4yNjEyNSwyNy4wODYyNSA4LjcxOTEyNSwyNi42MDEyNSBDMTEuMjI5MTI1LDI2LjEwNiAxMi40OTQ2MjUsMjQuMDIgMTIuMzQwMTI1LDIwLjY3MjI1IEMxNC43MTk2MjUsMjAuNjcyMjUgMTcuMTAxMTI1LDIwLjY0NzYyNSAxOS40ODA4NzUsMjAuNjg0Mzc1IEMyMC40MTAxMjUsMjAuNjk5IDIxLjEyNzUsMjAuNjAyNjI1IDIxLjgyNzUsMTkuNzgzMzc1IEMyMi45OCwxOC40MzUzNzUgMjUuMTAxMzc1LDE4LjU1NyAyNi4zNDI2MjUsMTkuODMwMTI1IEMyNy42MTExMjUsMjEuMTMxMjUgMjcuNTUwMzc1LDIzLjIyNDc1IDI2LjIwOCwyNC40NzEgQzI0LjkxMjg3NSwyNS42NzM1IDIyLjg2Njc1LDI1LjYwOTI1IDIxLjY1NSwyNC4zMTM1IEMyMS40MDYsMjQuMDQ2NSAyMS4yMDk3NSwyMy43MjkzNzUgMjAuOTYzMzc1LDIzLjQwMTI1IFoiLz4KICA8L2c+Cjwvc3ZnPgo=")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // Keep the red underlines for validation errors - they're important visual indicators

      // Console
      '.codicon-symbol-variable:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiI+CiAgPGc+CiAgICA8cGF0aCBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xLjE1NzI1MDM4LDEyLjIyNDA0MjQgTDUuNzY4Mjc0MjgsOC4zMjAxOTk3OSBDNS45Nzg2MTMwOCw4LjE0MjEyMDEzIDUuOTc5MTQwOTUsNy44NTgzMjY3OCA1Ljc2ODI3NDI4LDcuNjc5ODAwMjEgTDEuMTU3MjUwMzgsMy43NzU5NTc2MyBDMC45NDc1ODMyMDYsMy41OTg0NDY1OSAwLjk0NzU4MzIwNiwzLjMxMDY0NDMyIDEuMTU3MjUwMzgsMy4xMzMxMzMyOCBDMS4zNjY5MTc1NiwyLjk1NTYyMjI0IDEuNzA2ODU1MjIsMi45NTU2MjIyNCAxLjkxNjUyMjQsMy4xMzMxMzMyOCBMNi41Mjc1NDYyOSw3LjAzNjk3NTg2IEM3LjE1ODI4MzU3LDcuNTcwOTc4NTMgNy4xNTY2ODUwNiw4LjQzMDM3NDgyIDYuNTI3NTQ2MjksOC45NjMwMjQxNCBMMS45MTY1MjI0LDEyLjg2Njg2NjcgQzEuNzA2ODU1MjIsMTMuMDQ0Mzc3OCAxLjM2NjkxNzU2LDEzLjA0NDM3NzggMS4xNTcyNTAzOCwxMi44NjY4NjY3IEMwLjk0NzU4MzIwNiwxMi42ODkzNTU3IDAuOTQ3NTgzMjA2LDEyLjQwMTU1MzQgMS4xNTcyNTAzOCwxMi4yMjQwNDI0IFogTTksMTIgTDE1LDEyIEwxNSwxMyBMOSwxMyBMOSwxMiBaIi8+CiAgPC9nPgo8L3N2Zz4K")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // Inference
      '.codicon-symbol-snippet:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAuNWEuNS41IDAgMCAwLTEgMGMwIC40Mi0uMTMgMS4wNjEtLjUwNiAxLjU4M0MxMC4xMzcgMi41NzkgOS41MzcgMyA4LjUgM2EuNS41IDAgMCAwIDAgMWMxLjAzNyAwIDEuNjM3LjQyIDEuOTk0LjkxN0MxMC44NyA1LjQ0IDExIDYuMDggMTEgNi41YS41LjUgMCAwIDAgMSAwYzAtLjQyLjEzLTEuMDYxLjUwNi0xLjU4My4zNTctLjQ5Ni45NTctLjkxNyAxLjk5NC0uOTE3YS41LjUgMCAwIDAgMC0xYy0xLjAzNyAwLTEuNjM3LS40Mi0xLjk5NC0uOTE3QTIuODUyIDIuODUyIDAgMCAxIDEyIC41Wm0uNTg0IDNhMy4xIDMuMSAwIDAgMS0uODktLjgzMyAzLjQwNyAzLjQwNyAwIDAgMS0uMTk0LS4zMDIgMy40MDcgMy40MDcgMCAwIDEtLjE5NC4zMDIgMy4xIDMuMSAwIDAgMS0uODkuODMzIDMuMSAzLjEgMCAwIDEgLjg5LjgzM2MuMDcuMDk5LjEzNi4yLjE5NC4zMDIuMDU5LS4xMDIuMTIzLS4yMDMuMTk0LS4zMDJhMy4xIDMuMSAwIDAgMSAuODktLjgzM1pNNiAzLjVhLjUuNSAwIDAgMC0xIDB2LjAwNmExLjk4NCAxLjk4NCAwIDAgMS0uMDA4LjE3MyA1LjY0IDUuNjQgMCAwIDEtLjA2My41MiA1LjY0NSA1LjY0NSAwIDAgMS0uNTAxIDEuNTc3Yy0uMjgzLjU2Ni0uNyAxLjExNy0xLjMxNSAxLjUyN0MyLjUwMSA3LjcxIDEuNjYzIDggLjUgOGEuNS41IDAgMCAwIDAgMWMxLjE2MyAwIDIuMDAxLjI5IDIuNjEzLjY5Ny42MTYuNDEgMS4wMzIuOTYgMS4zMTUgMS41MjcuMjg0LjU2Ny40MjggMS4xNC41IDEuNTc3YTUuNjQ1IDUuNjQ1IDAgMCAxIC4wNzIuNjkzdi4wMDVhLjUuNSAwIDAgMCAxIC4wMDF2LS4wMDZhMS45OTUgMS45OTUgMCAwIDEgLjAwOC0uMTczIDYuMTQgNi4xNCAwIDAgMSAuMDYzLS41MmMuMDczLS40MzYuMjE3LTEuMDEuNTAxLTEuNTc3LjI4My0uNTY2LjctMS4xMTcgMS4zMTUtMS41MjdDOC40OTkgOS4yOSA5LjMzNyA5IDEwLjUgOWEuNS41IDAgMCAwIDAtMWMtMS4xNjMgMC0yLjAwMS0uMjktMi42MTMtLjY5Ny0uNjE2LS40MS0xLjAzMi0uOTYtMS4zMTUtMS41MjdhNS42NDUgNS42NDUgMCAwIDEtLjUtMS41NzdBNS42NCA1LjY0IDAgMCAxIDYgMy41MDZWMy41Wm0xLjk4OSA1YTQuNzE3IDQuNzE3IDAgMCAxLS42NTctLjM2NWMtLjc5MS0uNTI4LTEuMzEyLTEuMjI3LTEuNjU0LTEuOTExYTUuOTQzIDUuOTQzIDAgMCAxLS4xNzgtLjM5MWMtLjA1My4xMy0uMTEyLjI2LS4xNzguMzktLjM0Mi42ODUtLjg2MyAxLjM4NC0xLjY1NCAxLjkxMmE0LjcxOCA0LjcxOCAwIDAgMS0uNjU3LjM2NWMuMjM2LjEwOC40NTQuMjMuNjU3LjM2NS43OTEuNTI4IDEuMzEyIDEuMjI3IDEuNjU0IDEuOTExLjA2Ni4xMzEuMTI1LjI2Mi4xNzguMzkxLjA1My0uMTMuMTEyLS4yNi4xNzgtLjM5LjM0Mi0uNjg1Ljg2My0xLjM4NCAxLjY1NC0xLjkxMi4yMDMtLjEzNS40MjEtLjI1Ny42NTctLjM2NVpNMTIuNSA5YS41LjUgMCAwIDEgLjUuNWMwIC40Mi4xMyAxLjA2MS41MDYgMS41ODMuMzU3LjQ5Ni45NTcuOTE3IDEuOTk0LjkxN2EuNS41IDAgMCAxIDAgMWMtMS4wMzcgMC0xLjYzNy40Mi0xLjk5NC45MTdBMi44NTIgMi44NTIgMCAwIDAgMTMgMTUuNWEuNS41IDAgMCAxLTEgMGMwLS40Mi0uMTMtMS4wNjEtLjUwNi0xLjU4My0uMzU3LS40OTYtLjk1Ny0uOTE3LTEuOTk0LS45MTdhLjUuNSAwIDAgMSAwLTFjMS4wMzcgMCAxLjYzNy0uNDIgMS45OTQtLjkxN0EyLjg1MiAyLjg1MiAwIDAgMCAxMiA5LjVhLjUuNSAwIDAgMSAuNS0uNVptLjE5NCAyLjY2N2MuMjMuMzIuNTI0LjYwNy44OS44MzNhMy4xIDMuMSAwIDAgMC0uODkuODMzIDMuNDIgMy40MiAwIDAgMC0uMTk0LjMwMiAzLjQyIDMuNDIgMCAwIDAtLjE5NC0uMzAyIDMuMSAzLjEgMCAwIDAtLjg5LS44MzMgMy4xIDMuMSAwIDAgMCAuODktLjgzM2MuMDctLjA5OS4xMzYtLjIuMTk0LS4zMDIuMDU5LjEwMi4xMjMuMjAzLjE5NC4zMDJaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // foreach
      '.codicon-symbol-method:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yIDhhNS45OCA1Ljk4IDAgMCAwIDEuNzU3IDQuMjQzQTUuOTggNS45OCAwIDAgMCA4IDE0djFhNi45OCA2Ljk4IDAgMCAxLTQuOTUtMi4wNUE2Ljk4IDYuOTggMCAwIDEgMSA4YzAtMS43OS42ODMtMy41OCAyLjA0OC00Ljk0N2wuMDA0LS4wMDQuMDE5LS4wMkwzLjEgM0gxVjJoNHY0SDRWMy41MjVhNi41MSA2LjUxIDAgMCAwLS4yMi4yMWwtLjAxMy4wMTMtLjAwMy4wMDItLjAwNy4wMDdBNS45OCA1Ljk4IDAgMCAwIDIgOFptMTAuMjQzLTQuMjQzQTUuOTggNS45OCAwIDAgMCA4IDJWMWE2Ljk4IDYuOTggMCAwIDEgNC45NSAyLjA1QTYuOTggNi45OCAwIDAgMSAxNSA4YTYuOTggNi45OCAwIDAgMS0yLjA0NyA0Ljk0N2wtLjAwNS4wMDQtLjAxOC4wMi0uMDMuMDI5SDE1djFoLTR2LTRoMXYyLjQ3NWE2Ljc0NCA2Ljc0NCAwIDAgMCAuMjItLjIxbC4wMTMtLjAxMy4wMDMtLjAwMi4wMDctLjAwN0E1Ljk4IDUuOTggMCAwIDAgMTQgOGE1Ljk4IDUuOTggMCAwIDAtMS43NTctNC4yNDNaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // if
      '.codicon-symbol-keyword:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNSwxMC4wMzc3MTg4IEM1LjYzNTI1ODUyLDkuMzg5NDQzNzcgNi41MjA2NTU5MSw4Ljk4NzIxMDE2IDcuNSw4Ljk4NzIxMDE2IEw5LjUsOC45ODcyMTAxNiBDMTAuNzMwNzc2NSw4Ljk4NzIxMDE2IDExLjc1MzgyNCw4LjA5NzgxNjE1IDExLjk2MTUwMTMsNi45MjY2NjkxNiBDMTEuMTE4NDg5Miw2LjY5MTU0NjExIDEwLjUsNS45MTgwMDA5OSAxMC41LDUgQzEwLjUsMy44OTU0MzA1IDExLjM5NTQzMDUsMyAxMi41LDMgQzEzLjYwNDU2OTUsMyAxNC41LDMuODk1NDMwNSAxNC41LDUgQzE0LjUsNS45NDI1NDI2MiAxMy44NDc5OTk3LDYuNzMyODAyNDEgMTIuOTcwNDE0Miw2Ljk0NDM2NDM4IEMxMi43NDY0MzcxLDguNjYxMzUwMDIgMTEuMjc4MDU0Miw5Ljk4NzIxMDE2IDkuNSw5Ljk4NzIxMDE2IEw3LjUsOS45ODcyMTAxNiBDNi4yNjA2ODU5Miw5Ljk4NzIxMDE2IDUuMjMxOTkyODYsMTAuODg4OTg1OSA1LjAzNDI5NDgxLDEyLjA3MjE2MzMgQzUuODc5NDUzODgsMTIuMzA1ODgzOCA2LjUsMTMuMDgwNDczNyA2LjUsMTQgQzYuNSwxNS4xMDQ1Njk1IDUuNjA0NTY5NSwxNiA0LjUsMTYgQzMuMzk1NDMwNSwxNiAyLjUsMTUuMTA0NTY5NSAyLjUsMTQgQzIuNSwxMy4wNjgwODAzIDMuMTM3Mzg2MzksMTIuMjg1MDMwMSA0LDEyLjA2MzAwODcgTDQsMy45MzY5OTEyNiBDMy4xMzczODYzOSwzLjcxNDk2OTg2IDIuNSwyLjkzMTkxOTcxIDIuNSwyIEMyLjUsMC44OTU0MzA1IDMuMzk1NDMwNSwwIDQuNSwwIEM1LjYwNDU2OTUsMCA2LjUsMC44OTU0MzA1IDYuNSwyIEM2LjUsMi45MzE5MTk3MSA1Ljg2MjYxMzYxLDMuNzE0OTY5ODYgNSwzLjkzNjk5MTI2IEw1LDEwLjAzNzcxODggWiBNNC41LDMgQzUuMDUyMjg0NzUsMyA1LjUsMi41NTIyODQ3NSA1LjUsMiBDNS41LDEuNDQ3NzE1MjUgNS4wNTIyODQ3NSwxIDQuNSwxIEMzLjk0NzcxNTI1LDEgMy41LDEuNDQ3NzE1MjUgMy41LDIgQzMuNSwyLjU1MjI4NDc1IDMuOTQ3NzE1MjUsMyA0LjUsMyBaIE00LjUsMTUgQzUuMDUyMjg0NzUsMTUgNS41LDE0LjU1MjI4NDcgNS41LDE0IEM1LjUsMTMuNDQ3NzE1MyA1LjA1MjI4NDc1LDEzIDQuNSwxMyBDMy45NDc3MTUyNSwxMyAzLjUsMTMuNDQ3NzE1MyAzLjUsMTQgQzMuNSwxNC41NTIyODQ3IDMuOTQ3NzE1MjUsMTUgNC41LDE1IFogTTEyLjUsNiBDMTMuMDUyMjg0Nyw2IDEzLjUsNS41NTIyODQ3NSAxMy41LDUgQzEzLjUsNC40NDc3MTUyNSAxMy4wNTIyODQ3LDQgMTIuNSw0IEMxMS45NDc3MTUzLDQgMTEuNSw0LjQ0NzcxNTI1IDExLjUsNSBDMTEuNSw1LjU1MjI4NDc1IDExLjk0NzcxNTMsNiAxMi41LDYgWiIvPgo8L3N2Zz4K")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // parallel
      '.codicon-symbol-class:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNSAyYTEgMSAwIDAwLTEgMXYxMGExIDEgMCAxMDIgMFYzYTEgMSAwIDAwLTEtMXptNiAwYTEgMSAwIDAwLTEgMXYxMGExIDEgMCAxMDIgMFYzYTEgMSAwIDAwLTEtMXoiIC8+Cjwvc3ZnPg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // merge
      '.codicon-symbol-interface:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMC4zNTQgOC4zNTQgMTQuMjA3IDQuNSAxMC4zNTMuNjQ2bC0uNzA3LjcwOEwxMi4yOTMgNEgydjFoMTAuMjkzTDkuNjQ2IDcuNjQ2bC43MDcuNzA4Wm0tNC43MDcgN0wxLjc5MyAxMS41bDMuODU0LTMuODU0LjcwNy43MDhMMy43MDcgMTFIMTR2MUgzLjcwN2wyLjY0NyAyLjY0Ni0uNzA3LjcwOFoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPgo8L3N2Zz4K")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // wait
      '.codicon-symbol-constant:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNOC41IDcuNVY0aC0xdjQuNUgxMnYtMUg4LjVaIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTUgOEE3IDcgMCAxIDEgMSA4YTcgNyAwIDAgMSAxNCAwWm0tMSAwQTYgNiAwIDEgMSAyIDhhNiA2IDAgMCAxIDEyIDBaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // alert
      '.codicon-symbol-customcolor:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNOSAxMmExIDEgMCAxIDEtMiAwIDEgMSAwIDAgMSAyIDBaIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNNy41IDEwVjVoMXY1aC0xWiIgY2xpcC1ydWxlPSJldmVub2RkIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNOCAxYTEgMSAwIDAgMSAuODY0LjQ5Nmw3IDEyQTEgMSAwIDAgMSAxNSAxNUgxYTEgMSAwIDAgMS0uODY0LTEuNTA0bDctMTJBMSAxIDAgMCAxIDggMVpNMSAxNGgxNEw4IDIgMSAxNFoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPgo8L3N2Zz4K")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // scheduled
      '.codicon-symbol-operator:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNOC41IDcuNVY0aC0xdjQuNUgxMnYtMUg4LjVaIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTUgOEE3IDcgMCAxIDEgMSA4YTcgNyAwIDAgMSAxNCAwWm0tMSAwQTYgNiAwIDEgMSAyIDhhNiA2IDAgMCAxIDEyIDBaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // manual
      '.codicon-symbol-type-parameter:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zLjI5MyA5LjI5MyA0IDEwbC0xIDRoMTBsLTEtNCAuNzA3LS43MDdhMSAxIDAgMCAxIC4yNjMuNDY0bDEgNEExIDEgMCAwIDEgMTMgMTVIM2ExIDEgMCAwIDEtLjk3LTEuMjQybDEtNGExIDEgMCAwIDEgLjI2My0uNDY1Wk04IDljMyAwIDQgMSA0IDEgLjcwNy0uNzA3LjcwNi0uNzA4LjcwNi0uNzA4bC0uMDAxLS4wMDEtLjAwMi0uMDAyLS4wMDUtLjAwNS0uMDEtLjAxYTEuNzk4IDEuNzk4IDAgMCAwLS4xMDEtLjA4OSAyLjkwNyAyLjkwNyAwIDAgMC0uMjM1LS4xNzMgNC42NiA0LjY2IDAgMCAwLS44NTYtLjQ0IDcuMTEgNy4xMSAwIDAgMC0xLjEzNi0uMzQyIDQgNCAwIDEgMC00LjcyIDAgNy4xMSA3LjExIDAgMCAwLTEuMTM2LjM0MiA0LjY2IDQuNjYgMCAwIDAtLjg1Ni40NCAyLjkwOSAyLjkwOSAwIDAgMC0uMzM1LjI2MmwtLjAxMS4wMS0uMDA1LjAwNS0uMDAyLjAwMmgtLjAwMVMzLjI5MyA5LjI5NCA0IDEwYzAgMCAxLTEgNC0xWm0wLTFhMyAzIDAgMSAwIDAtNiAzIDMgMCAwIDAgMCA2WiIgY2xpcC1ydWxlPSJldmVub2RkIi8+Cjwvc3ZnPgo=")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // Diff highlighting styles (from main branch)
      '.changed-line-highlight': {
        backgroundColor: euiTheme.colors.backgroundLightWarning,
        borderLeft: `2px solid ${euiTheme.colors.warning}`,
        opacity: 0.7,
      },
      '.changed-line-margin': {
        backgroundColor: euiTheme.colors.warning,
        width: '2px',
        opacity: 0.7,
      },
    }),
  editorContainer: css({
    flex: '1 1 0',
    minWidth: 0,
    overflowY: 'auto',
    minHeight: 0,
  }),
  validationErrorsContainer: css({
    flexShrink: 0,
    overflow: 'hidden',
    zIndex: 2, // to overlay the editor flying action buttons
  }),
};
