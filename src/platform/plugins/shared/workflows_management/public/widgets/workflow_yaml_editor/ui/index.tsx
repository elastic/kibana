/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, UseEuiTheme } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import { getJsonSchemaFromYamlSchema } from '@kbn/workflows';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { WORKFLOW_ZOD_SCHEMA, WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { YamlEditor } from '../../../shared/ui/yaml_editor';
import { useYamlValidation } from '../lib/use_yaml_validation';
import { navigateToErrorPosition } from '../lib/utils';
import { WorkflowYAMLEditorProps } from '../model/types';
import { WorkflowYAMLValidationErrors } from './workflow_yaml_validation_errors';
import { getCompletionItemProvider } from '../lib/get_completion_item_provider';

const WorkflowSchemaUri = 'file:///workflow-schema.json';

const jsonSchema = getJsonSchemaFromYamlSchema(WORKFLOW_ZOD_SCHEMA);

const useWorkflowJsonSchema = () => {
  return jsonSchema;
};

const editorStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      minHeight: 0,
      '.template-variable-valid': {
        backgroundColor: euiTheme.colors.backgroundLightPrimary,
        borderRadius: '2px',
      },
      '.template-variable-error': {
        backgroundColor: euiTheme.colors.backgroundLightWarning,
        borderRadius: '2px',
      },
    }),
};

export const WorkflowYAMLEditor = ({
  workflowId,
  filename = `${workflowId}.yaml`,
  readOnly = false,
  onMount,
  onChange,
  onSave,
  onValidationErrors,
  ...props
}: WorkflowYAMLEditorProps) => {
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

  const { validationErrors, validateVariables, handleMarkersChanged } = useYamlValidation({
    workflowYamlSchema: WORKFLOW_ZOD_SCHEMA_LOOSE,
    onValidationErrors,
  });

  const [isEditorMounted, setIsEditorMounted] = useState(false);

  const validateMustacheExpressionsEverywhere = useCallback(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (!model) {
        return;
      }
      validateVariables(editorRef.current);
    }
  }, [validateVariables]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (onChange) {
        onChange(value);
      }
      validateMustacheExpressionsEverywhere();
    },
    [onChange, validateMustacheExpressionsEverywhere]
  );

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    editor.updateOptions({
      glyphMargin: true,
    });

    onMount?.(editor, monaco);

    // Monkey patching to set the initial markers
    // https://github.com/suren-atoyan/monaco-react/issues/70#issuecomment-760389748
    const setModelMarkers = monaco.editor.setModelMarkers;
    monaco.editor.setModelMarkers = function (model, owner, markers) {
      setModelMarkers.call(monaco.editor, model, owner, markers);
      handleMarkersChanged(editor, model.uri, markers, owner);
    };

    monaco.languages.registerCompletionItemProvider(
      'yaml',
      getCompletionItemProvider(WORKFLOW_ZOD_SCHEMA_LOOSE)
    );

    setIsEditorMounted(true);
  };

  useEffect(() => {
    // After editor is mounted, validate the initial content
    if (isEditorMounted && editorRef.current) {
      validateMustacheExpressionsEverywhere();
    }
  }, [validateMustacheExpressionsEverywhere, isEditorMounted]);

  const editorOptions = useMemo<monaco.editor.IStandaloneEditorConstructionOptions>(
    () => ({
      readOnly,
      minimap: { enabled: false },
      lineNumbers: 'on',
      glyphMargin: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      lineNumbersMinChars: 2,
      insertSpaces: true,
      fontSize: 14,
      renderWhitespace: 'all',
      wordWrap: 'on',
      wordWrapColumn: 80,
      wrappingIndent: 'indent',
      theme: 'vs-light',
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

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={styles.container}>
      <EuiFlexItem css={{ flex: 1, minHeight: 0 }}>
        <YamlEditor
          editorDidMount={handleEditorDidMount}
          onChange={handleChange}
          options={editorOptions}
          // @ts-expect-error - TODO: fix this
          schemas={schemas}
          {...props}
        />
      </EuiFlexItem>
      <EuiFlexItem css={{ flexGrow: 0, minHeight: 0 }}>
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
