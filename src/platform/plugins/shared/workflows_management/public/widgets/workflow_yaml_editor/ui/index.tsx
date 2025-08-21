/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import { getJsonSchemaFromYamlSchema } from '@kbn/workflows';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import YAML from 'yaml';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { WORKFLOW_ZOD_SCHEMA, WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { YamlEditor } from '../../../shared/ui/yaml_editor';
import { useYamlValidation } from '../lib/use_yaml_validation';
import {
  getHighlightStepDecorations,
  getMonacoRangeFromYamlNode,
  navigateToErrorPosition,
} from '../lib/utils';
import type { WorkflowYAMLEditorProps } from '../model/types';
import { WorkflowYAMLValidationErrors } from './workflow_yaml_validation_errors';
import { getCompletionItemProvider } from '../lib/get_completion_item_provider';
import { getStepNode } from '../../../../common/lib/yaml_utils';
import { UnsavedChangesPrompt } from '../../../shared/ui/unsaved_changes_prompt';

const WorkflowSchemaUri = 'file:///workflow-schema.json';

const jsonSchema = getJsonSchemaFromYamlSchema(WORKFLOW_ZOD_SCHEMA);

const useWorkflowJsonSchema = () => {
  return jsonSchema;
};

const editorStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      position: 'relative',
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
      '.step-execution-completed': {
        backgroundColor: euiTheme.colors.backgroundLightSuccess,
      },
      '.step-execution-failed': {
        backgroundColor: euiTheme.colors.backgroundLightDanger,
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
};

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

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | monaco.editor.IDiffEditor | null>(
    null
  );

  const workflowJsonSchema = useWorkflowJsonSchema();
  const schemas = useMemo(() => {
    return [
      {
        fileMatch: ['*'],
        schema: workflowJsonSchema,
        uri: WorkflowSchemaUri,
      },
    ];
  }, [workflowJsonSchema]);

  const yamlDocumentRef = useRef<YAML.Document | null>(null);
  const highlightStepDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const stepExecutionsDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const { validationErrors, validateVariables, handleMarkersChanged } = useYamlValidation({
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
        const value = editorRef.current.getValue();
        yamlDocumentRef.current = YAML.parseDocument(value ?? '');
      } catch (error) {
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

    onMount?.(editor, monaco);

    setIsEditorMounted(true);
  };

  useEffect(() => {
    // After editor is mounted, validate the initial content
    if (isEditorMounted && editorRef.current) {
      changeSideEffects();
    }
  }, [changeSideEffects, isEditorMounted]);

  useEffect(() => {
    const model = editorRef.current?.getModel() as monaco.editor.ITextModel;
    if (!isEditorMounted || !yamlDocumentRef.current || !highlightStep || !model) {
      if (highlightStepDecorationCollectionRef.current) {
        highlightStepDecorationCollectionRef.current.clear();
      }
      return;
    }
    const stepNode = getStepNode(yamlDocumentRef.current, highlightStep);
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
  }, [highlightStep, isEditorMounted]);

  useEffect(() => {
    const model = editorRef.current?.getModel() as monaco.editor.ITextModel;
    if (!isEditorMounted || !model || !stepExecutions || !yamlDocumentRef.current) {
      if (stepExecutionsDecorationCollectionRef.current) {
        stepExecutionsDecorationCollectionRef.current.clear();
      }
      return;
    }
    const decorations = stepExecutions
      .map((stepExecution) => {
        // @ts-expect-error - TODO: fix this
        const stepNode = getStepNode(yamlDocumentRef.current, stepExecution.stepId);
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
    if (stepExecutionsDecorationCollectionRef.current) {
      stepExecutionsDecorationCollectionRef.current.clear();
    }
    stepExecutionsDecorationCollectionRef.current =
      editorRef.current?.createDecorationsCollection(decorations) ?? null;
  }, [isEditorMounted, stepExecutions, highlightStep]);

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
      theme: 'workflows-yaml-light',
      padding: {
        top: 24,
        bottom: 64,
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

  const styles = useMemoCss(editorStyles);

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
      if (editorRef.current && !('getOriginalEditor' in editorRef.current)) {
        handleMarkersChanged(editorRef.current, model.uri, markers, owner);
      }
    };

    return () => {
      // Reset the monaco.editor.setModelMarkers to the original function
      monaco.editor.setModelMarkers = setModelMarkers;
    };
  }, [handleMarkersChanged]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={styles.container}>
      <UnsavedChangesPrompt hasUnsavedChanges={hasChanges} />
      <EuiFlexItem
        grow={false}
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
      </EuiFlexItem>
      <EuiFlexItem css={{ flex: 1, minHeight: 0 }}>
        <YamlEditor
          editorDidMount={handleEditorDidMount}
          onChange={handleChange}
          options={editorOptions}
          // @ts-expect-error - TODO: fix this
          schemas={schemas}
          suggestionProvider={completionProvider}
          {...props}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <WorkflowYAMLValidationErrors
          isMounted={isEditorMounted}
          validationErrors={validationErrors}
          onErrorClick={(error) => {
            if (!editorRef.current) {
              return;
            }
            navigateToErrorPosition(editorRef.current, error.lineNumber, error.column);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
