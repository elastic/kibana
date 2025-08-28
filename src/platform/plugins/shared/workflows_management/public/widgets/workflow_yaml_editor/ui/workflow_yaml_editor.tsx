/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { getJsonSchemaFromYamlSchema } from '@kbn/workflows';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import YAML from 'yaml';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import type { SchemasSettings } from 'monaco-yaml';
import { WORKFLOW_ZOD_SCHEMA, WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { YamlEditor } from '../../../shared/ui/yaml_editor';
import { useYamlValidation } from '../lib/use_yaml_validation';
import {
  getHighlightStepDecorations,
  getMonacoRangeFromYamlNode,
  navigateToErrorPosition,
} from '../lib/utils';
import { WorkflowYAMLValidationErrors } from './workflow_yaml_validation_errors';
import { getCompletionItemProvider } from '../lib/get_completion_item_provider';
import { getStepNode } from '../../../../common/lib/yaml_utils';
import { UnsavedChangesPrompt } from '../../../shared/ui/unsaved_changes_prompt';
import type { YamlValidationError } from '../model/types';

const WorkflowSchemaUri = 'file:///workflow-schema.json';

const jsonSchema = getJsonSchemaFromYamlSchema(WORKFLOW_ZOD_SCHEMA);

const useWorkflowJsonSchema = () => {
  return jsonSchema;
};

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
  ...props
}: WorkflowYAMLEditorProps) => {
  const { euiTheme } = useEuiTheme();

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
  const highlightStepDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const stepExecutionsDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

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
        setYamlDocument(YAML.parseDocument(value ?? ''));
      } catch (error) {
        setYamlDocument(null);
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

    onMount?.(editor, monaco);

    setIsEditorMounted(true);
  };

  useEffect(() => {
    // After editor is mounted or workflowId changes, validate the initial content
    if (isEditorMounted && editorRef.current && editorRef.current.getModel()?.getValue() !== '') {
      changeSideEffects();
    }
  }, [changeSideEffects, isEditorMounted, workflowId]);

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
      formatOnType: true,
    }),
    [readOnly]
  );

  const styles = useMemoCss(componentStyles);

  // Clean up the monaco model and editor on unmount
  useEffect(() => {
    const editor = editorRef.current;
    return () => {
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
        backgroundColor: euiTheme.colors.backgroundLightWarning,
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
