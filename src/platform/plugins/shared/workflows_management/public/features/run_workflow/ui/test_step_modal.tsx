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
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor, monaco } from '@kbn/code-editor';
import React, { useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { StepContextMockData } from '../../../shared/utils/build_step_context_mock/build_step_context_mock';

export function TestStepModal({
  initialStepContextMock,
  onClose,
  onSubmit,
}: {
  initialStepContextMock: StepContextMockData;
  onSubmit?: (params: { stepInputs: Record<string, any> }) => void;
  onClose: () => void;
}) {
  const styles = useMemoCss(componentStyles);
  const [inputsJson, setInputsJson] = React.useState<string>(
    JSON.stringify(initialStepContextMock.stepContext, null, 2)
  );
  const [isJsonValid, setIsJsonValid] = React.useState<boolean>(true);
  const modalTitleId = useGeneratedHtmlId();
  const id = 'json-editor-schema';

  const jsonSchema = useMemo(() => {
    return zodToJsonSchema(initialStepContextMock.schema, {
      $refStrategy: 'none',
    });
  }, [initialStepContextMock.schema]);

  const modelUri = useMemo(() => `inmemory://models/${id}.json`, [id]);
  const schemaUri = useMemo(() => `inmemory://schemas/${id}`, [id]);

  // Hook Monaco on mount to register the schema for validation + suggestions
  const mountedOnce = useRef(false);
  const handleMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    if (mountedOnce.current) return;
    mountedOnce.current = true;

    try {
      // First, configure the JSON language service with schema validation
      monaco.languages.json?.jsonDefaults?.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        enableSchemaRequest: false,
        schemas: [
          {
            uri: schemaUri, // schema URI
            fileMatch: [modelUri], // bind to this specific model URI
            schema: jsonSchema as any,
          },
        ],
      });

      // Get current editor content
      const text = editor.getValue() || JSON.stringify(initialStepContextMock.stepContext, null, 2);

      // Create model with the specific URI that matches our schema fileMatch
      const uri = monaco.Uri.parse(modelUri);
      const model = monaco.editor.createModel(text, 'json', uri);

      // Set the model to the editor
      editor.setModel(model);
    } catch (error) {
      // Monaco setup failed - fall back to basic JSON editing
    }

    // Optional: seed example if editor is empty
    if (!editor.getValue()?.trim()) {
      editor.setValue(JSON.stringify(initialStepContextMock.stepContext, null, 2));
    }
  };

  useEffect(() => {
    try {
      JSON.parse(inputsJson);
      setIsJsonValid(true);
    } catch (e) {
      setIsJsonValid(false);
    }
  }, [inputsJson]);

  const handleInputChange = (value: string) => {
    setInputsJson(value);
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({ stepInputs: JSON.parse(inputsJson) });
    }
  };

  return (
    <EuiModal aria-labelledby={modalTitleId} maxWidth={false} onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage id="workflows.testStepModal.title" defaultMessage="Test step" />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="l" css={styles.codeEditorWrapper}>
          <EuiFlexItem grow={false}>
            <CodeEditor
              languageId="json"
              value={inputsJson}
              width={1000}
              height={500}
              editorDidMount={handleMount}
              onChange={handleInputChange}
              dataTestSubj={'workflow-event-json-editor'}
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
                theme: 'vs-light',
                quickSuggestions: {
                  other: true,
                  comments: false,
                  strings: true,
                },
                formatOnType: true,
                fixedOverflowWidgets: true,
                hover: {
                  delay: 300,
                  sticky: true,
                },
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem css={{ alignSelf: 'flex-end' }} grow={false}>
            <EuiButton
              onClick={handleSubmit}
              disabled={!isJsonValid}
              color="success"
              iconType="play"
              size="s"
            >
              <FormattedMessage id="workflows.testStepModal.submitRunBtn" defaultMessage="Run" />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
    </EuiModal>
  );
}

const componentStyles = {
  codeEditorWrapper: ({ euiTheme }: UseEuiTheme) => css`
    height: 100%;
    overflow: auto;
    position: relative;

    .monaco-editor .editor-widget {
      background-color: ${euiTheme.colors.mediumShade} !important;
    }

    /* Monaco editor error popup positioning offset */
    .monaco-editor .monaco-hover,
    .monaco-editor .suggest-widget,
    .monaco-editor .parameter-hints-widget,
    .monaco-editor .monaco-quick-input-widget {
      transform: translateY(-290px) translateX(-250px) !important;
      z-index: 9999 !important;
    }

    /* Specific styling for hover widgets in modals */
    .monaco-editor .monaco-hover .hover-contents {
      border-radius: 4px;
      max-width: 400px;
    }
  `,
};
