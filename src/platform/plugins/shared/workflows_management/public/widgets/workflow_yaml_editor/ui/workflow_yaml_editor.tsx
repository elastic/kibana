/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiIcon, useEuiTheme, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { monaco } from '@kbn/monaco';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { getJsonSchemaFromYamlSchema } from '@kbn/workflows';
import type { SchemasSettings } from 'monaco-yaml';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import YAML, { isPair, isScalar, visit } from 'yaml';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { getStepNode } from '../../../../common/lib/yaml_utils';
import { UnsavedChangesPrompt } from '../../../shared/ui/unsaved_changes_prompt';
import { YamlEditor } from '../../../shared/ui/yaml_editor';
import { getCompletionItemProvider } from '../lib/get_completion_item_provider';
import { useYamlValidation } from '../lib/use_yaml_validation';
import { WORKFLOW_ZOD_SCHEMA, WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import {
  getHighlightStepDecorations,
  getMonacoRangeFromYamlNode,
  navigateToErrorPosition,
} from '../lib/utils';
import type { YamlValidationError } from '../model/types';
import { WorkflowYAMLValidationErrors } from './workflow_yaml_validation_errors';
import { registerElasticsearchStepHoverProvider } from '../lib/elasticsearch_step_hover_provider';
import { updateElasticsearchStepDecorations } from '../lib/elasticsearch_step_decorations';
import { enhanceEditorWithElasticsearchStepContextMenu } from '../lib/elasticsearch_step_context_menu_provider';
import { ElasticsearchStepActionsProvider } from '../lib/elasticsearch_step_actions_provider';
import { ElasticsearchStepActions } from './elasticsearch_step_actions';

const getTriggerNodes = (
  yamlDocument: YAML.Document
): Array<{ node: any; triggerType: string; typePair: any }> => {
  const triggerNodes: Array<{ node: any; triggerType: string; typePair: any }> = [];

  if (!yamlDocument?.contents) return triggerNodes;

  visit(yamlDocument, {
    Pair(key, pair, ancestors) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'type') {
        return;
      }

      // Check if this is a type field within a trigger
      const path = ancestors.slice();
      let isTriggerType = false;

      // Walk up the ancestors to see if we're in a triggers array
      for (let i = path.length - 1; i >= 0; i--) {
        const ancestor = path[i];
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'triggers') {
          isTriggerType = true;
          break;
        }
      }

      if (isTriggerType && isScalar(pair.value)) {
        const triggerType = pair.value.value as string;
        // Find the parent map node that contains this trigger
        const triggerMapNode = ancestors[ancestors.length - 1];
        triggerNodes.push({
          node: triggerMapNode,
          triggerType,
          typePair: pair, // Store the actual type pair for precise positioning
        });
      }
    },
  });

  return triggerNodes;
};

const WorkflowSchemaUri = 'file:///workflow-schema.json';

const useWorkflowJsonSchema = () => {
  // Generate JSON schema dynamically to include all current connectors
  return useMemo(() => {
    try {
      // Expose schema to global scope for debugging if needed
      (window as any).WORKFLOW_ZOD_SCHEMA = WORKFLOW_ZOD_SCHEMA;

      const jsonSchema = getJsonSchemaFromYamlSchema(WORKFLOW_ZOD_SCHEMA);

      // Post-process to improve type field descriptions in Monaco tooltips
      return improveTypeFieldDescriptions(jsonSchema) ?? null;
    } catch (error) {
      return null;
    }
  }, []);
};

/**
 * Improve the JSON schema to show better tooltips for the type field
 * Instead of showing all 568 connector types, show grouped descriptions
 */
function improveTypeFieldDescriptions(schema: any): any {
  const processSchema = (obj: any, path: string[] = []): any => {
    if (!obj || typeof obj !== 'object') return obj;


    // Check if we're processing a step definition with a 'with' property
    if (obj.properties?.type && obj.properties?.with) {
      // Replace the 'with' schema with a generic one that has NO properties
      obj.properties.with = {
        type: 'object',
        description: 'Connector parameters - use autocomplete for available options',
        additionalProperties: true
        // NO properties defined here - this prevents monaco-yaml from suggesting anything
      };
    }
    
    // Look for the type field in steps
    if (obj.properties?.type && path.includes('steps')) {
      // Remove enum/const values to prevent Monaco from suggesting them
      delete obj.properties.type.enum;
      delete obj.properties.type.const;
      delete obj.properties.type.oneOf;

      // Just define it as a string with a pattern
      obj.properties.type = {
        type: 'string',
        description: 'Workflow connector type - use autocomplete for available options',
        // Don't include enum values here
      };
    }

    // Handle oneOf arrays that contain type definitions
    if (obj.oneOf && Array.isArray(obj.oneOf) && path.includes('steps')) {
      // Replace the complex oneOf with a simpler schema
      return {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Workflow connector type - use autocomplete for available options',
            // No enum values
          },
          with: {
            type: 'object',
            description: 'Parameters for the connector - press Ctrl+Space (Ctrl+I on Mac) to see all available options',
            additionalProperties: true,
          },
          name: {
            type: 'string',
            description: 'Optional step name',
          },
        },
        required: ['type'],
        additionalProperties: false,
      };
    }

    // Recursively process
    if (Array.isArray(obj)) {
      return obj.map((item, index) => processSchema(item, [...path, index.toString()]));
    } else if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = processSchema(value, [...path, key]);
      }
      return result;
    }

    return obj;
  };

  return processSchema(schema);
}

export interface WorkflowYAMLEditorProps {
  workflowId?: string;
  filename?: string;
  readOnly?: boolean;
  hasChanges?: boolean;
  lastUpdatedAt?: Date;
  highlightStep?: string;
  stepExecutions?: EsWorkflowStepExecution[];
  'data-testid'?: string;
  value: string;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => void;
  onChange?: (value: string | undefined) => void;
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationError[]>>;
  onSave?: (value: string) => void;
  esHost?: string;
  kibanaHost?: string;
}

export const WorkflowYAMLEditor = ({
  workflowId,
  filename = `${workflowId}.yaml`,
  readOnly = false,
  hasChanges = false,
  lastUpdatedAt,
  highlightStep,
  stepExecutions,
  onMount,
  onChange,
  onSave,
  onValidationErrors,
  esHost = 'http://localhost:9200',
  kibanaHost,
  ...props
}: WorkflowYAMLEditorProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { http, notifications },
  } = useKibana<CoreStart>();

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
  const highlightStepDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const stepExecutionsDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const alertTriggerDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const elasticsearchStepDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const elasticsearchStepActionsProviderRef =
    useRef<ElasticsearchStepActionsProvider | null>(null);

  // Disposables for Monaco providers
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  const [editorActionsCss, setEditorActionsCss] = useState<React.CSSProperties>({});

  const {
    error: errorValidating,
    validationErrors,
    validateVariables,
    handleMarkersChanged,
  } = useYamlValidation({
    workflowYamlSchema: WORKFLOW_ZOD_SCHEMA_LOOSE,
    onValidationErrors,
  });

  const [isEditorMounted, setIsEditorMounted] = useState(false);

  const changeSideEffects = useCallback(() => {
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
        setYamlDocument(null);
        yamlDocumentRef.current = null;
      }
    }
  }, [validateVariables]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (onChange) {
        onChange(value);
      }
      changeSideEffects();
    },
    [onChange, changeSideEffects]
  );

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    editor.updateOptions({
      glyphMargin: true,
    });

    // Setup Elasticsearch step providers if we have the required services
    if (http && notifications) {
      console.log('WorkflowYAMLEditor: Setting up Elasticsearch step providers');
      
      // Register hover provider
      const hoverProvider = registerElasticsearchStepHoverProvider({
        http,
        notifications: notifications as any, // Temporary type cast
        esHost,
        kibanaHost: kibanaHost || window.location.origin,
        getYamlDocument: () => yamlDocumentRef.current,
      });
      disposablesRef.current.push(hoverProvider);
      console.log('WorkflowYAMLEditor: Hover provider registered');

      // Actions provider will be created later when YAML document is ready

      // Enhance editor with context menu (keyboard shortcuts)
      const contextMenuDisposable = enhanceEditorWithElasticsearchStepContextMenu(editor, {
        http,
        notifications: notifications as any, // Temporary type cast
        esHost,
        kibanaHost: kibanaHost || window.location.origin,
        getYamlDocument: () => yamlDocumentRef.current,
      });
      disposablesRef.current.push(contextMenuDisposable);
      console.log('WorkflowYAMLEditor: Context menu enhanced');
    } else {
      console.log('WorkflowYAMLEditor: Missing http or notifications services');
    }

    onMount?.(editor, monaco);

    setIsEditorMounted(true);
    
    // Trigger initial parsing if there's content
    setTimeout(() => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model && model.getValue().trim()) {
          changeSideEffects();
        }
      }
    }, 100);
  };

  useEffect(() => {
    // After editor is mounted or workflowId changes, validate the initial content
    if (isEditorMounted && editorRef.current && editorRef.current.getModel()?.getValue() !== '') {
      changeSideEffects();
    }
  }, [changeSideEffects, isEditorMounted, workflowId]);

  // Initialize actions provider after YAML document is ready
  useEffect(() => {
    if (isEditorMounted && editorRef.current && yamlDocument && http && notifications && !elasticsearchStepActionsProviderRef.current) {
      console.log('WorkflowYAMLEditor: Late initializing actions provider with YAML document');
      
      elasticsearchStepActionsProviderRef.current = new ElasticsearchStepActionsProvider(
        editorRef.current,
        setEditorActionsCss,
        {
          http,
          notifications: notifications as any,
          esHost,
          kibanaHost: kibanaHost || window.location.origin,
          getYamlDocument: () => yamlDocumentRef.current,
        }
      );
      console.log('WorkflowYAMLEditor: Late actions provider created');
    }
  }, [isEditorMounted, yamlDocument]); // Removed changing dependencies

  useEffect(() => {
    const model = editorRef.current?.getModel() ?? null;
    if (highlightStepDecorationCollectionRef.current) {
      highlightStepDecorationCollectionRef.current.clear();
    }
    if (!model || !isEditorMounted || !yamlDocument || !highlightStep) {
      return;
    }
    const stepNode = getStepNode(yamlDocument, highlightStep);
    if (!stepNode) {
      return;
    }
    const range = getMonacoRangeFromYamlNode(model, stepNode);
    if (!range) {
      return;
    }
    editorRef.current?.revealLineInCenter(range.startLineNumber);
    if (highlightStepDecorationCollectionRef.current) {
      highlightStepDecorationCollectionRef.current.clear();
    }
    highlightStepDecorationCollectionRef.current =
      editorRef.current?.createDecorationsCollection(getHighlightStepDecorations(model, range)) ??
      null;
  }, [highlightStep, isEditorMounted, yamlDocument]);

  useEffect(() => {
    const model = editorRef.current?.getModel() ?? null;
    if (stepExecutionsDecorationCollectionRef.current) {
      // clear existing decorations
      stepExecutionsDecorationCollectionRef.current.clear();
    }

    if (!model || !yamlDocument || !stepExecutions || stepExecutions.length === 0) {
      // no model or yamlDocument or sExecutions, skipping
      return;
    }

    const decorations = stepExecutions
      .map((stepExecution) => {
        const stepNode = getStepNode(yamlDocument, stepExecution.stepId);
        if (!stepNode) {
          return null;
        }
        const stepRange = getMonacoRangeFromYamlNode(model, stepNode);
        if (!stepRange) {
          return null;
        }
        const decoration: monaco.editor.IModelDeltaDecoration = {
          range: new monaco.Range(
            stepRange.startLineNumber,
            stepRange.startColumn,
            stepRange.startLineNumber,
            stepRange.endColumn
          ),
          options: {
            glyphMarginClassName: `step-execution-${stepExecution.status}-glyph ${
              !!highlightStep && highlightStep !== stepExecution.stepId ? 'dimmed' : ''
            }`,
          },
        };
        const bgClassName = `step-execution-${stepExecution.status} ${
          !!highlightStep && highlightStep !== stepExecution.stepId ? 'dimmed' : ''
        }`;
        // TODO: handle steps with nested steps
        const decoration2: monaco.editor.IModelDeltaDecoration = {
          range: new monaco.Range(
            stepRange.startLineNumber,
            stepRange.startColumn,
            stepRange.endLineNumber - 1,
            stepRange.endColumn
          ),
          options: {
            className: bgClassName,
            marginClassName: bgClassName,
            isWholeLine: true,
          },
        };
        return [decoration, decoration2];
      })
      .flat()
      .filter((d) => d !== null) as monaco.editor.IModelDeltaDecoration[];

    stepExecutionsDecorationCollectionRef.current =
      editorRef.current?.createDecorationsCollection(decorations) ?? null;
  }, [isEditorMounted, stepExecutions, highlightStep, yamlDocument]);

  useEffect(() => {
    const model = editorRef.current?.getModel() ?? null;
    if (alertTriggerDecorationCollectionRef.current) {
      // clear existing decorations
      alertTriggerDecorationCollectionRef.current.clear();
    }

    // Don't show alert dots when in executions view
    if (!model || !yamlDocument || !isEditorMounted || readOnly) {
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

          typeRange = {
            startLineNumber: typeLineNumber,
            endLineNumber: typeLineNumber,
            startColumn: 1,
            endColumn: model.getLineMaxColumn(typeLineNumber),
          };
        }

        const glyphDecoration: monaco.editor.IModelDeltaDecoration = {
          range: new monaco.Range(
            typeRange.startLineNumber,
            1,
            typeRange.startLineNumber,
            model.getLineMaxColumn(typeRange.startLineNumber)
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
            typeRange.startLineNumber,
            1,
            typeRange.startLineNumber,
            model.getLineMaxColumn(typeRange.startLineNumber)
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

    alertTriggerDecorationCollectionRef.current =
      editorRef.current?.createDecorationsCollection(decorations) ?? null;
  }, [isEditorMounted, yamlDocument, readOnly]);

  // Handle Elasticsearch step decorations - DISABLED for now to avoid conflicts
  // The ElasticsearchStepActionsProvider handles cursor-based highlighting instead
  // useEffect(() => {
  //   if (!isEditorMounted || !editorRef.current || readOnly) {
  //     return;
  //   }

  //   elasticsearchStepDecorationCollectionRef.current = updateElasticsearchStepDecorations(
  //     editorRef.current,
  //     yamlDocument,
  //     elasticsearchStepDecorationCollectionRef.current
  //   );
  // }, [isEditorMounted, yamlDocument, readOnly]);

  const completionProvider = useMemo(() => {
    return getCompletionItemProvider(WORKFLOW_ZOD_SCHEMA_LOOSE);
  }, []);

  useEffect(() => {
    monaco.editor.defineTheme('workflows-subdued', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': euiTheme.colors.backgroundBaseSubdued,
      },
    });
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
      renderWhitespace: 'all',
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
        // Add these to show suggestions after 1 character
        triggerCharacters: true,
        minWordLength: 1, // Show suggestions after 1 character
        filterGraceful: true, // Better filtering
        localityBonus: true, // Prioritize matches near cursor
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
      disposablesRef.current.forEach(disposable => disposable.dispose());
      disposablesRef.current = [];
      
      // Dispose of decorations and actions provider
      elasticsearchStepDecorationCollectionRef.current?.clear();
      elasticsearchStepActionsProviderRef.current?.dispose();
      elasticsearchStepActionsProviderRef.current = null;
      
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
    <div css={styles.container}>
      <UnsavedChangesPrompt hasUnsavedChanges={hasChanges} />
      {/* Floating Elasticsearch step actions */}
      <EuiFlexGroup
        className="elasticsearch-step-actions"
        gutterSize="xs"
        responsive={false}
        style={editorActionsCss}
        justifyContent="center"
        alignItems="center"
      >
        <EuiFlexItem grow={false}>
          {http && notifications && (
            <ElasticsearchStepActions
              actionsProvider={elasticsearchStepActionsProviderRef.current}
              http={http}
              notifications={notifications as any}
              esHost={esHost}
              kibanaHost={kibanaHost}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={{ position: 'absolute', top: euiTheme.size.xxs, right: euiTheme.size.m, zIndex: 10 }}
      >
        {hasChanges ? (
          <div
            css={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
              color: euiTheme.colors.accent,
            }}
          >
            <EuiIcon type="dot" />
            <span>
              <FormattedMessage
                id="workflows.workflowDetail.yamlEditor.unsavedChanges"
                defaultMessage="Unsaved changes"
              />
            </span>
          </div>
        ) : (
          <div
            css={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
              color: euiTheme.colors.textSubdued,
            }}
          >
            <EuiIcon type="check" />
            <span>
              <FormattedMessage
                id="workflows.workflowDetail.yamlEditor.saved"
                defaultMessage="Saved"
              />{' '}
              {lastUpdatedAt ? <FormattedRelative value={lastUpdatedAt} /> : null}
            </span>
          </div>
        )}
      </div>
      <div css={styles.editorContainer}>
        <YamlEditor
          editorDidMount={handleEditorDidMount}
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
        />
      </div>
    </div>
  );
};

const componentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      minHeight: 0,
      // css classes for the monaco editor
      '.template-variable-valid': {
        backgroundColor: euiTheme.colors.backgroundLightPrimary,
        borderRadius: '2px',
      },
      '.template-variable-error': {
        backgroundColor: euiTheme.colors.vis.euiColorVisWarning1,
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
      
      // Custom icons for Monaco autocomplete
      // Slack
      '.codicon-symbol-event:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIj4KICAgIDxwYXRoIGZpbGw9IiNFMDFFNUEiIGQ9Ik02LjgxMjkwMzIzIDMuNDA2NDUxNjFDNi44MTI5MDMyMyA1LjIzODcwOTY4IDUuMzE2MTI5MDMgNi43MzU0ODM4NyAzLjQ4Mzg3MDk3IDYuNzM1NDgzODcgMS42NTE2MTI5IDYuNzM1NDgzODcuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSAzLjQwNjQ1MTYxLjE1NDgzODcxIDEuNTc0MTkzNTUgMS42NTE2MTI5LjA3NzQxOTM1NDggMy40ODM4NzA5Ny4wNzc0MTkzNTQ4TDYuODEyOTAzMjMuMDc3NDE5MzU0OCA2LjgxMjkwMzIzIDMuNDA2NDUxNjF6TTguNDkwMzIyNTggMy40MDY0NTE2MUM4LjQ5MDMyMjU4IDEuNTc0MTkzNTUgOS45ODcwOTY3Ny4wNzc0MTkzNTQ4IDExLjgxOTM1NDguMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEgMy40MDY0NTE2MUwxNS4xNDgzODcxIDExLjc0MTkzNTVDMTUuMTQ4Mzg3MSAxMy41NzQxOTM1IDEzLjY1MTYxMjkgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgOS45ODcwOTY3NyAxNS4wNzA5Njc3IDguNDkwMzIyNTggMTMuNTc0MTkzNSA4LjQ5MDMyMjU4IDExLjc0MTkzNTVMOC40OTAzMjI1OCAzLjQwNjQ1MTYxeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAxNi43NzQpIi8+CiAgICA8cGF0aCBmaWxsPSIjMzZDNUYwIiBkPSJNMTEuODE5MzU0OCA2LjgxMjkwMzIzQzkuOTg3MDk2NzcgNi44MTI5MDMyMyA4LjQ5MDMyMjU4IDUuMzE2MTI5MDMgOC40OTAzMjI1OCAzLjQ4Mzg3MDk3IDguNDkwMzIyNTggMS42NTE2MTI5IDkuOTg3MDk2NzcuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSAxMy42NTE2MTI5LjE1NDgzODcxIDE1LjE0ODM4NzEgMS42NTE2MTI5IDE1LjE0ODM4NzEgMy40ODM4NzA5N0wxNS4xNDgzODcxIDYuODEyOTAzMjMgMTEuODE5MzU0OCA2LjgxMjkwMzIzek0xMS44MTkzNTQ4IDguNDkwMzIyNThDMTMuNjUxNjEyOSA4LjQ5MDMyMjU4IDE1LjE0ODM4NzEgOS45ODcwOTY3NyAxNS4xNDgzODcxIDExLjgxOTM1NDggMTUuMTQ4Mzg3MSAxMy42NTE2MTI5IDEzLjY1MTYxMjkgMTUuMTQ4Mzg3MSAxMS44MTkzNTQ4IDE1LjE0ODM4NzFMMy40ODM4NzA5NyAxNS4xNDgzODcxQzEuNjUxNjEyOSAxNS4xNDgzODcxLjE1NDgzODcxIDEzLjY1MTYxMjkuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSA5Ljk4NzA5Njc3IDEuNjUxNjEyOSA4LjQ5MDMyMjU4IDMuNDgzODcwOTcgOC40OTAzMjI1OEwxMS44MTkzNTQ4IDguNDkwMzIyNTh6Ii8+CiAgICA8cGF0aCBmaWxsPSIjMkVCNjdEIiBkPSJNOC40MTI5MDMyMyAxMS44MTkzNTQ4QzguNDEyOTAzMjMgOS45ODcwOTY3NyA5LjkwOTY3NzQyIDguNDkwMzIyNTggMTEuNzQxOTM1NSA4LjQ5MDMyMjU4IDEzLjU3NDE5MzUgOC40OTAzMjI1OCAxNS4wNzA5Njc3IDkuOTg3MDk2NzcgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgMTMuNjUxNjEyOSAxMy41NzQxOTM1IDE1LjE0ODM4NzEgMTEuNzQxOTM1NSAxNS4xNDgzODcxTDguNDEyOTAzMjMgMTUuMTQ4Mzg3MSA4LjQxMjkwMzIzIDExLjgxOTM1NDh6TTYuNzM1NDgzODcgMTEuODE5MzU0OEM2LjczNTQ4Mzg3IDEzLjY1MTYxMjkgNS4yMzg3MDk2OCAxNS4xNDgzODcxIDMuNDA2NDUxNjEgMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEuMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTEuODE5MzU0OEwuMDc3NDE5MzU0OCAzLjQ4Mzg3MDk3Qy4wNzc0MTkzNTQ4IDEuNjUxNjEyOSAxLjU3NDE5MzU1LjE1NDgzODcxIDMuNDA2NDUxNjEuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSA2LjczNTQ4Mzg3IDEuNjUxNjEyOSA2LjczNTQ4Mzg3IDMuNDgzODcwOTdMNi43MzU0ODM4NyAxMS44MTkzNTQ4eiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTYuNzc0KSIvPgogICAgPHBhdGggZmlsbD0iI0VDQjIyRSIgZD0iTTMuNDA2NDUxNjEgOC40MTI5MDMyM0M1LjIzODcwOTY4IDguNDEyOTAzMjMgNi43MzU0ODM4NyA5LjkwOTY3NzQyIDYuNzM1NDgzODcgMTEuNzQxOTM1NSA2LjczNTQ4Mzg3IDEzLjU3NDE5MzUgNS4yMzg3MDk2OCAxNS4wNzA5Njc3IDMuNDA2NDUxNjEgMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcuMDc3NDE5MzU0OCAxMy41NzQxOTM1LjA3NzQxOTM1NDggMTEuNzQxOTM1NUwuMDc3NDE5MzU0OCA4LjQxMjkwMzIzIDMuNDA2NDUxNjEgOC40MTI5MDMyM3pNMy40MDY0NTE2MSA2LjczNTQ4Mzg3QzEuNTc0MTkzNTUgNi43MzU0ODM4Ny4wNzc0MTkzNTQ4IDUuMjM4NzA5NjguMDc3NDE5MzU0OCAzLjQwNjQ1MTYxLjA3NzQxOTM1NDggMS41NzQxOTM1NSAxLjU3NDE5MzU1LjA3NzQxOTM1NDggMy40MDY0NTE2MS4wNzc0MTkzNTQ4TDExLjc0MTkzNTUuMDc3NDE5MzU0OEMxMy41NzQxOTM1LjA3NzQxOTM1NDggMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcgMy40MDY0NTE2MSAxNS4wNzA5Njc3IDUuMjM4NzA5NjggMTMuNTc0MTkzNSA2LjczNTQ4Mzg3IDExLjc0MTkzNTUgNi43MzU0ODM4N0wzLjQwNjQ1MTYxIDYuNzM1NDgzODd6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi43NzQgMTYuNzc0KSIvPgogIDwvZz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },
      // Elasticsearch
      '.codicon-symbol-struct:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyBkYXRhLXR5cGU9ImxvZ29FbGFzdGljIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDMyIDMyIj4KPHBhdGggZD0iTTI3LjU2NDggMTEuMjQyNUMzMi42NjU0IDEzLjE4MiAzMi40MzczIDIwLjYzNzggMjcuMzE5NyAyMi4zNjk0TDI3LjE1NzYgMjIuNDI0MUwyNi45OTA2IDIyLjM4NTFMMjEuNzEwMyAyMS4xNDY4TDIxLjQ0MjcgMjEuMDg0M0wyMS4zMTU4IDIwLjg0MDFMMTkuOTE1NCAxOC4xNDk3TDE5LjY5ODYgMTcuNzMyN0wyMC4wNTExIDE3LjQyMjJMMjYuOTU1NCAxMS4zNTI4TDI3LjIyNjkgMTEuMTEzNkwyNy41NjQ4IDExLjI0MjVaIiBmaWxsPSIjMEI2NEREIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNMjIuMDQ3MiAyMS4yMzlMMjYuODQ3IDIyLjM2NEwyNy4xNjI1IDIyLjQzODJMMjcuMjczOCAyMi43NDE5TDI3LjMzOTIgMjIuOTMyNEMyNy45NjE1IDI0Ljg5NjIgMjcuMDc5NyAyNi43MTE3IDI1LjY4NjkgMjcuNzI5MkMyNC4yNTI4IDI4Ljc3NjcgMjIuMTc3NSAyOS4wNDg4IDIwLjUwNTIgMjcuNzUwN0wyMC4yMTUyIDI3LjUyNjFMMjAuMjgzNiAyNy4xNjQ4TDIxLjMyMDcgMjEuNzEwN0wyMS40Mzc5IDIxLjA5NjRMMjIuMDQ3MiAyMS4yMzlaIiBmaWxsPSIjOUFEQzMwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNNS4wMTA3NCA5LjYyOTk3TDEwLjI3NzMgMTAuODg0OUwxMC41NTk2IDEwLjk1MjJMMTAuNjgxNiAxMS4yMTU5TDExLjkxNyAxMy44NjUzTDEyLjEwMzUgMTQuMjY2N0wxMS43NzY0IDE0LjU2MzZMNS4wNDI5NyAyMC42NjQyTDQuNzcwNTEgMjAuOTEyMkw0LjQyNTc4IDIwLjc4MDRDMS45Mzg5IDE5LjgzMDMgMC43MjA0MDcgMTcuNDU1OCAwLjc1MTk1MyAxNS4xNTM0QzAuNzgzNjg2IDEyLjg0NTMgMi4wNzMwNSAxMC41MDk0IDQuNjgzNTkgOS42NDQ2Mkw0Ljg0NTcgOS41OTA5MUw1LjAxMDc0IDkuNjI5OTdaIiBmaWxsPSIjMUJBOUY1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNNi4yODEwMSA0LjMxOTgyQzcuNjk3MjMgMy4yMzk0IDkuNzYxMzUgMi45MzM0IDExLjUwMjcgNC4yNTE0NkwxMS43OTk2IDQuNDc3MDVMMTEuNzI5MiA0Ljg0MzI2TDEwLjY3NzUgMTAuMzE2OUwxMC41NTkzIDEwLjkzMjFMOS45NDk5NSAxMC43ODc2TDUuMTUwMTUgOS42NTA4OEw0LjgzMzc0IDkuNTc1NjhMNC43MjMzOSA5LjI3MDAyQzQuMDE1MDcgNy4zMDI5NSA0Ljg3MjYzIDUuMzk0MjkgNi4yODEwMSA0LjMxOTgyWiIgZmlsbD0iI0YwNEU5OCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KPHBhdGggZD0iTTEyLjQ2NjEgMTQuNDMzMUwxOS40OTYzIDE3LjY0NEwxOS42ODM4IDE3LjczTDE5Ljc3ODYgMTcuOTEyNkwyMS4zMzQyIDIwLjg5NzlMMjEuNDI5OSAyMS4wODI1TDIxLjM5MDkgMjEuMjg3NkwyMC4yMjQ5IDI3LjM4OTJMMjAuMjAxNCAyNy41MTEyTDIwLjEzMzEgMjcuNjEzOEMxNy40NTM0IDMxLjU3MiAxMy4yMzA1IDMyLjMyNDUgOS44NjQ1IDMwLjg3MzVDNi41MDkzMiAyOS40MjcyIDQuMDMwNyAyNS44MDQ0IDQuNzM5NSAyMS4xMzgyTDQuNzcxNzMgMjAuOTI3Mkw0LjkyOTkzIDIwLjc4MzdMMTEuODEzNyAxNC41MzQ3TDEyLjEwNjcgMTQuMjY5TDEyLjQ2NjEgMTQuNDMzMVoiIGZpbGw9IiMwMkJDQjciIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS4yIi8+CjxwYXRoIGQ9Ik0xMS44OTIzIDQuNDEwMjJDMTQuNDM4MSAwLjY3NjQyNiAxOC43NDEgMC4xMDUzMDMgMjIuMTMzNSAxLjUzOTEyQzI1LjUyNjMgMi45NzMwMiAyOC4xMjMxIDYuNDU5NzkgMjcuMjM2MSAxMC45MDI0TDI3LjE5NyAxMS4xMDE2TDI3LjA0MzcgMTEuMjM1NEwxOS45NzgzIDE3LjQ0ODNMMTkuNjg1MyAxNy43MDYxTDE5LjMzMTggMTcuNTQzTDEyLjMyOTggMTQuMzMyMUwxMi4xMjg3IDE0LjI0MDNMMTIuMDM0OSAxNC4wMzkxTDEwLjY1NSAxMS4wNTE4TDEwLjU3NCAxMC44NzUxTDEwLjYxMTEgMTAuNjg0NkwxMS43OTk2IDQuNjMyODdMMTEuODIzIDQuNTExNzhMMTEuODkyMyA0LjQxMDIyWiIgZmlsbD0iI0ZFQzUxNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KPC9zdmc+")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },
      // Kibana
      '.codicon-symbol-module:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQpIj4KICAgIDxwb2x5Z29uIGZpbGw9IiNGMDRFOTgiIHBvaW50cz0iMCAwIDAgMjguNzg5IDI0LjkzNSAuMDE3Ii8+CiAgICA8cGF0aCBjbGFzcz0iZXVpSWNvbl9fZmlsbE5lZ2F0aXZlIiBkPSJNMCwxMiBMMCwyOC43ODkgTDExLjkwNiwxNS4wNTEgQzguMzY4LDEzLjExNSA0LjMxNywxMiAwLDEyIi8+CiAgICA8cGF0aCBmaWxsPSIjMDBCRkIzIiBkPSJNMTQuNDc4NSwxNi42NjQgTDIuMjY3NSwzMC43NTQgTDEuMTk0NSwzMS45OTEgTDI0LjM4NjUsMzEuOTkxIEMyMy4xMzQ1LDI1LjY5OSAxOS41MDM1LDIwLjI3MiAxNC40Nzg1LDE2LjY2NCIvPgogIDwvZz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },
      // HTTP
      '.codicon-symbol-reference:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTYuNSA0QzUuMTE5IDQgNCA1LjExOSA0IDYuNUM0IDcuODgxIDUuMTE5IDkgNi41IDlIMTBDMTEuMzgxIDkgMTIuNSA3Ljg4MSAxMi41IDYuNUMxMi41IDUuMTE5IDExLjM4MSA0IDEwIDRINi41Wk02LjUgNUgxMEMxMC44MjggNSAxMS41IDUuNjcyIDExLjUgNi41QzExLjUgNy4zMjggMTAuODI4IDggMTAgOEg2LjVDNS42NzIgOCA1IDcuMzI4IDUgNi41QzUgNS42NzIgNS42NzIgNSA2LjUgNVoiIGZpbGw9IiNGRjZDMzciLz4KPHBhdGggZD0iTTYgN0M2IDguMzgxIDcuMTE5IDkuNSA4LjUgOS41SDEyQzEzLjM4MSA5LjUgMTQuNSA4LjM4MSAxNC41IDdDMTQuNSA1LjYxOSAxMy4zODEgNC41IDEyIDQuNUg4LjVDNy4xMTkgNC41IDYgNS42MTkgNiA3WiIgZmlsbD0iIzAwN0NGRiIgb3BhY2l0eT0iMC43Ii8+PC9zdmc+")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // Console
      '.codicon-symbol-variable:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiI+CiAgPGc+CiAgICA8cGF0aCBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xLjE1NzI1MDM4LDEyLjIyNDA0MjQgTDUuNzY4Mjc0MjgsOC4zMjAxOTk3OSBDNS45Nzg2MTMwOCw4LjE0MjEyMDEzIDUuOTc5MTQwOTUsNy44NTgzMjY3OCA1Ljc2ODI3NDI4LDcuNjc5ODAwMjEgTDEuMTU3MjUwMzgsMy43NzU5NTc2MyBDMC45NDc1ODMyMDYsMy41OTg0NDY1OSAwLjk0NzU4MzIwNiwzLjMxMDY0NDMyIDEuMTU3MjUwMzgsMy4xMzMxMzMyOCBDMS4zNjY5MTc1NiwyLjk1NTYyMjI0IDEuNzA2ODU1MjIsMi45NTU2MjIyNCAxLjkxNjUyMjQsMy4xMzMxMzMyOCBMNi41Mjc1NDYyOSw3LjAzNjk3NTg2IEM3LjE1ODI4MzU3LDcuNTcwOTc4NTMgNy4xNTY2ODUwNiw4LjQzMDM3NDgyIDYuNTI3NTQ2MjksOC45NjMwMjQxNCBMMS45MTY1MjI0LDEyLjg2Njg2NjcgQzEuNzA2ODU1MjIsMTMuMDQ0Mzc3OCAxLjM2NjkxNzU2LDEzLjA0NDM3NzggMS4xNTcyNTAzOCwxMi44NjY4NjY3IEMwLjk0NzU4MzIwNiwxMi42ODkzNTU3IDAuOTQ3NTgzMjA2LDEyLjQwMTU1MzQgMS4xNTcyNTAzOCwxMi4yMjQwNDI0IFogTTksMTIgTDE1LDEyIEwxNSwxMyBMOSwxMyBMOSwxMiBaIi8+CiAgPC9nPgo8L3N2Zz4K")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // Inference
      '.codicon-symbol-snippet:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAuNWEuNS41IDAgMCAwLTEgMGMwIC40Mi0uMTMgMS4wNjEtLjUwNiAxLjU4M0MxMC4xMzcgMi41NzkgOS41MzcgMyA4LjUgM2EuNS41IDAgMCAwIDAgMWMxLjAzNyAwIDEuNjM3LjQyIDEuOTk0LjkxN0MxMC44NyA1LjQ0IDExIDYuMDggMTEgNi41YS41LjUgMCAwIDAgMSAwYzAtLjQyLjEzLTEuMDYxLjUwNi0xLjU4My4zNTctLjQ5Ni45NTctLjkxNyAxLjk5NC0uOTE3YS41LjUgMCAwIDAgMC0xYy0xLjAzNyAwLTEuNjM3LS40Mi0xLjk5NC0uOTE3QTIuODUyIDIuODUyIDAgMCAxIDEyIC41Wm0uNTg0IDNhMy4xIDMuMSAwIDAgMS0uODktLjgzMyAzLjQwNyAzLjQwNyAwIDAgMS0uMTk0LS4zMDIgMy40MDcgMy40MDcgMCAwIDEtLjE5NC4zMDIgMy4xIDMuMSAwIDAgMS0uODkuODMzIDMuMSAzLjEgMCAwIDEgLjg5LjgzM2MuMDcuMDk5LjEzNi4yLjE5NC4zMDIuMDU5LS4xMDIuMTIzLS4yMDMuMTk0LS4zMDJhMy4xIDMuMSAwIDAgMSAuODktLjgzM1pNNiAzLjVhLjUuNSAwIDAgMC0xIDB2LjAwNmExLjk4NCAxLjk4NCAwIDAgMS0uMDA4LjE3MyA1LjY0IDUuNjQgMCAwIDEtLjA2My41MiA1LjY0NSA1LjY0NSAwIDAgMS0uNTAxIDEuNTc3Yy0uMjgzLjU2Ni0uNyAxLjExNy0xLjMxNSAxLjUyN0MyLjUwMSA3LjcxIDEuNjYzIDggLjUgOGEuNS41IDAgMCAwIDAgMWMxLjE2MyAwIDIuMDAxLjI5IDIuNjEzLjY5Ny42MTYuNDEgMS4wMzIuOTYgMS4zMTUgMS41MjcuMjg0LjU2Ny40MjggMS4xNC41IDEuNTc3YTUuNjQ1IDUuNjQ1IDAgMCAxIC4wNzIuNjkzdi4wMDVhLjUuNSAwIDAgMCAxIC4wMDF2LS4wMDZhMS45OTUgMS45OTUgMCAwIDEgLjAwOC0uMTczIDYuMTQgNi4xNCAwIDAgMSAuMDYzLS41MmMuMDczLS40MzYuMjE3LTEuMDEuNTAxLTEuNTc3LjI4My0uNTY2LjctMS4xMTcgMS4zMTUtMS41MjdDOC40OTkgOS4yOSA5LjMzNyA5IDEwLjUgOWEuNS41IDAgMCAwIDAtMWMtMS4xNjMgMC0yLjAwMS0uMjktMi42MTMtLjY5Ny0uNjE2LS40MS0xLjAzMi0uOTYtMS4zMTUtMS41MjdhNS42NDUgNS42NDUgMCAwIDEtLjUtMS41NzdBNS42NCA1LjY0IDAgMCAxIDYgMy41MDZWMy41Wm0xLjk4OSA1YTQuNzE3IDQuNzE3IDAgMCAxLS42NTctLjM2NWMtLjc5MS0uNTI4LTEuMzEyLTEuMjI3LTEuNjU0LTEuOTExYTUuOTQzIDUuOTQzIDAgMCAxLS4xNzgtLjM5MWMtLjA1My4xMy0uMTEyLjI2LS4xNzguMzktLjM0Mi42ODUtLjg2MyAxLjM4NC0xLjY1NCAxLjkxMmE0LjcxOCA0LjcxOCAwIDAgMS0uNjU3LjM2NWMuMjM2LjEwOC40NTQuMjMuNjU3LjM2NS43OTEuNTI4IDEuMzEyIDEuMjI3IDEuNjU0IDEuOTExLjA2Ni4xMzEuMTI1LjI2Mi4xNzguMzkxLjA1My0uMTMuMTEyLS4yNi4xNzgtLjM5LjM0Mi0uNjg1Ljg2My0xLjM4NCAxLjY1NC0xLjkxMi4yMDMtLjEzNS40MjEtLjI1Ny42NTctLjM2NVpNMTIuNSA5YS41LjUgMCAwIDEgLjUuNWMwIC40Mi4xMyAxLjA2MS41MDYgMS41ODMuMzU3LjQ5Ni45NTcuOTE3IDEuOTk0LjkxN2EuNS41IDAgMCAxIDAgMWMtMS4wMzcgMC0xLjYzNy40Mi0xLjk5NC45MTdBMi44NTIgMi44NTIgMCAwIDAgMTMgMTUuNWEuNS41IDAgMCAxLTEgMGMwLS40Mi0uMTMtMS4wNjEtLjUwNi0xLjU4My0uMzU3LS40OTYtLjk1Ny0uOTE3LTEuOTk0LS45MTdhLjUuNSAwIDAgMSAwLTFjMS4wMzcgMCAxLjYzNy0uNDIgMS45OTQtLjkxN0EyLjg1MiAyLjg1MiAwIDAgMCAxMiA5LjVhLjUuNSAwIDAgMSAuNS0uNVptLjE5NCAyLjY2N2MuMjMuMzIuNTI0LjYwNy44OS44MzNhMy4xIDMuMSAwIDAgMC0uODkuODMzIDMuNDIgMy40MiAwIDAgMC0uMTk0LjMwMiAzLjQyIDMuNDIgMCAwIDAtLjE5NC0uMzAyIDMuMSAzLjEgMCAwIDAtLjg5LS44MzMgMy4xIDMuMSAwIDAgMCAuODktLjgzM2MuMDctLjA5OS4xMzYtLjIuMTk0LS4zMDIuMDU5LjEwMi4xMjMuMjAzLjE5NC4zMDJaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
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
  }),
};
