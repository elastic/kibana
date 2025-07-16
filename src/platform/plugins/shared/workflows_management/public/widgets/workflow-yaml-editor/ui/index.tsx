/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { monaco } from '@kbn/monaco';
import { getJsonSchemaFromYamlSchema } from '@kbn/workflows';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { navigateToErrorPosition } from '../lib/utils';
import { WorkflowYAMLEditorProps } from '../model/types';
import { WorkflowYAMLValidationErrors } from './workflow_yaml_validation_errors';
import { useYamlValidation } from '../lib/useYamlValidation';
import { YamlEditor } from '../../../shared/ui/yaml_editor';
import { WORKFLOW_ZOD_SCHEMA } from '../../../../common';

const WorkflowSchemaUri = 'file:///workflow-schema.json';

const jsonSchema = getJsonSchemaFromYamlSchema(WORKFLOW_ZOD_SCHEMA);

const useWorkflowSecrets = (workflowId: string | null | undefined) => {
  // TODO: Implement real Kibana workflow secrets hook
  return { data: {} };
};

const useWorkflowJsonSchema = () => {
  return jsonSchema;
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
  const monacoRef = useRef<typeof monaco | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | monaco.editor.IDiffEditor | null>(
    null
  );
  const { data: secrets } = useWorkflowSecrets(workflowId);

  const { validationErrors, validateMustacheExpressions, handleMarkersChanged } = useYamlValidation(
    {
      onValidationErrors,
    }
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

  const [isEditorMounted, setIsEditorMounted] = useState(false);

  const getEditorValue = useCallback(() => {
    if (!editorRef.current) {
      return;
    }
    const model = editorRef.current.getModel();
    if (!model) {
      return;
    }
    if ('original' in model) {
      return model.modified.getValue();
    }
    return model.getValue();
  }, []);

  const validateMustacheExpressionsEverywhere = useCallback(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (!model) {
        return;
      }
      if ('original' in model) {
        validateMustacheExpressions(model.original, monacoRef.current, secrets ?? {});
        validateMustacheExpressions(model.modified, monacoRef.current, secrets ?? {});
      } else {
        validateMustacheExpressions(model, monacoRef.current, secrets ?? {});
      }
    }
  }, [validateMustacheExpressions, secrets]);

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

    setIsEditorMounted(true);
  };

  useEffect(() => {
    // After editor is mounted, validate the initial content
    if (isEditorMounted && editorRef.current && monacoRef.current) {
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

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={{ height: '100%', minHeight: 0 }}>
      <EuiFlexItem css={{ flex: 1, minHeight: 0 }}>
        <YamlEditor
          editorDidMount={handleEditorDidMount}
          onChange={handleChange}
          options={editorOptions}
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
