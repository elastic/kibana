/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useRef } from 'react';
import { CodeEditor, monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_MONACO_EDITOR_THEME } from '@kbn/workflows-ui';
import type { z } from '@kbn/zod/v4';
import { InputValidationCallout } from './input_validation_callout';

const SCHEMA_URI = `inmemory://schemas/test-step-json-manual-editor-schema`;

export interface StepExecuteManualFormProps {
  value: string;
  setValue: (value: string) => void;
  errors: string | null;
  warnings: string | null;
  contextJsonSchema?: z.core.JSONSchema.BaseSchema;
}

export const StepExecuteManualForm = React.memo<StepExecuteManualFormProps>(
  ({ value, setValue, errors, warnings, contextJsonSchema }) => {
    // Hook Monaco on mount to register the schema for validation + suggestions
    const mountedOnce = useRef(false);
    const handleMount = useCallback(
      (editor: monaco.editor.IStandaloneCodeEditor) => {
        if (!contextJsonSchema || mountedOnce.current) return;
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
                schema: contextJsonSchema,
              },
            ],
          });
        } catch (error) {
          // Monaco setup failed - fall back to basic JSON editing
        }
      },
      [contextJsonSchema]
    );

    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        css={css`
          min-height: 0;
        `}
      >
        {(errors || warnings) && (
          <EuiFlexItem grow={false}>
            <InputValidationCallout errors={errors} warnings={warnings} />
          </EuiFlexItem>
        )}
        <EuiFlexItem
          css={css`
            overflow: hidden;
          `}
        >
          <EuiFormRow
            label={i18n.translate('workflows.testStepModal.inputDataLabel', {
              defaultMessage: 'Input Data',
            })}
            fullWidth
            css={css`
              flex: 1;
              display: flex;
              flex-direction: column;
              min-height: 0;
              .euiFormRow__fieldWrapper {
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
              }
              .euiFormRow__labelWrapper {
                padding-left: 0;
              }
            `}
          >
            <CodeEditor
              languageId="json"
              value={value}
              width="100%"
              height="100%"
              editorDidMount={handleMount}
              onChange={setValue}
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
