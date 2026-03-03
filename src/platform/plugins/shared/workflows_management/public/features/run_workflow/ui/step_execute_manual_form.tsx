/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useRef } from 'react';
import { CodeEditor, monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import type { z } from '@kbn/zod/v4';
import { WORKFLOWS_MONACO_EDITOR_THEME } from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';

const SCHEMA_URI = `inmemory://schemas/test-step-json-manual-editor-schema`;

export interface StepExecuteManualFormProps {
  value: string;
  onChange: (value: string) => void;
  errors: string | null;
  inputsJsonSchema?: z.core.JSONSchema.BaseSchema;
}

export const StepExecuteManualForm = React.memo<StepExecuteManualFormProps>(
  ({ value, onChange, errors, inputsJsonSchema }) => {
    // Hook Monaco on mount to register the schema for validation + suggestions
    const mountedOnce = useRef(false);
    const handleMount = useCallback(
      (editor: monaco.editor.IStandaloneCodeEditor) => {
        if (!inputsJsonSchema || mountedOnce.current) return;
        mountedOnce.current = true;

        try {
          // First, configure the JSON language service with schema validation
          const currentModel = editor.getModel();
          monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: false,
            enableSchemaRequest: false,
            schemas: [
              {
                uri: SCHEMA_URI, // schema URI
                fileMatch: [currentModel?.uri.toString() ?? ''], // bind to this specific model URI
                schema: inputsJsonSchema,
              },
            ],
          });
        } catch (error) {
          // Monaco setup failed - fall back to basic JSON editing
        }
      },
      [inputsJsonSchema]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="l">
        {errors && (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={i18n.translate('workflows.testStepModal.invalidJsonError', {
                defaultMessage: 'Invalid JSON',
              })}
            >
              <p>{errors}</p>
            </EuiCallOut>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('workflows.testStepModal.inputDataLabel', {
              defaultMessage: 'Input Data',
            })}
            fullWidth
            css={css`
              .euiFormRow__labelWrapper {
                padding-left: 0;
              }
            `}
          >
            <CodeEditor
              languageId="json"
              value={value}
              width={1000}
              height={500}
              editorDidMount={handleMount}
              onChange={onChange}
              fitToContent={{
                minLines: 5,
                maxLines: 15,
              }}
              dataTestSubj="workflow-event-manual-json-editor"
              overflowWidgetsContainerZIndexOverride={6001}
              options={{
                language: 'json',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                lineNumbers: 'on',
                glyphMargin: true,
                tabSize: 2,
                lineNumbersMinChars: 2,
                insertSpaces: true,
                fontSize: 14,
                renderWhitespace: 'all',
                wordWrapColumn: 80,
                wrappingIndent: 'indent',
                theme: WORKFLOWS_MONACO_EDITOR_THEME,
                formatOnType: true,
                quickSuggestions: false,
                suggestOnTriggerCharacters: false,
                wordBasedSuggestions: false,
                parameterHints: {
                  enabled: false,
                },
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
StepExecuteManualForm.displayName = 'StepExecuteManualForm';
