/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, UseEuiTheme } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { MonacoYamlOptions } from 'monaco-yaml';
import type { JSONSchema7 } from 'json-schema';
import { getJsonSchemaFromYamlSchema } from '@kbn/workflows';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { YamlEditor } from '../../../shared/ui/yaml_editor';
import { useYamlValidation } from '../lib/use_yaml_validation';
import { navigateToErrorPosition } from '../lib/utils';
import { WorkflowYAMLEditorProps } from '../model/types';
import { WorkflowYAMLValidationErrors } from './workflow_yaml_validation_errors';
import { getCompletionItemProvider } from '../lib/get_completion_item_provider';

// Note: schema URI and memoized JSON schema unused here; validation uses Zod and monaco schemas elsewhere.

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
  const completionDisposableRef = useRef<monaco.IDisposable | null>(null);
  const originalSetModelMarkersRef = useRef<typeof monaco.editor.setModelMarkers | null>(null);

  const { services } = useKibana();

  const { validationErrors, validateVariables, handleMarkersChanged } = useYamlValidation({
    workflowYamlSchema: WORKFLOW_ZOD_SCHEMA_LOOSE,
    onValidationErrors,
    http: services.http,
  });

  const [isEditorMounted, setIsEditorMounted] = useState(false);

  // Build JSON schema once and feed it to monaco-yaml to restore original init behavior
  const yamlSchemas: MonacoYamlOptions['schemas'] = useMemo(() => {
    try {
      const jsonSchema = getJsonSchemaFromYamlSchema(
        WORKFLOW_ZOD_SCHEMA_LOOSE
      ) as unknown as JSONSchema7;
      const schemas: MonacoYamlOptions['schemas'] = [
        {
          uri: 'kibana://schemas/workflows',
          fileMatch: ['*'],
          schema: jsonSchema as unknown as any,
        },
      ];
      return schemas;
    } catch (e) {
      return [];
    }
  }, []);

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
    originalSetModelMarkersRef.current = setModelMarkers;
    monaco.editor.setModelMarkers = function (model, owner, markers) {
      setModelMarkers.call(monaco.editor, model, owner, markers);
      handleMarkersChanged(editor, model.uri, markers, owner);
    };

    // Register completion provider and keep a disposable to clean up later
    completionDisposableRef.current = monaco.languages.registerCompletionItemProvider(
      'yaml',
      getCompletionItemProvider(WORKFLOW_ZOD_SCHEMA_LOOSE, services.http)
    );

    // Proactively set empty markers so footer leaves the initializing state
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, 'mustache-validation', []);
    }

    setIsEditorMounted(true);

    // Trigger initial validation immediately after mount
    try {
      validateMustacheExpressionsEverywhere();
    } catch (e) {
      // noop
    }
  };

  useEffect(() => {
    // After editor is mounted, validate the initial content
    if (isEditorMounted && editorRef.current) {
      validateMustacheExpressionsEverywhere();
    }

    return () => {
      // Cleanup on unmount: dispose completion provider and restore setModelMarkers
      try {
        completionDisposableRef.current?.dispose();
      } catch (e) {
        // noop
      }
      completionDisposableRef.current = null;

      if (originalSetModelMarkersRef.current) {
        monaco.editor.setModelMarkers = originalSetModelMarkersRef.current;
        originalSetModelMarkersRef.current = null;
      }
    };
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
          schemas={yamlSchemas}
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
