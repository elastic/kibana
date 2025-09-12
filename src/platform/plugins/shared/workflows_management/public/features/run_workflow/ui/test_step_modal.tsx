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
import { CodeEditor } from '@kbn/code-editor';
import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import type { monaco } from '@kbn/monaco';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { StepContextMockData } from '../../../shared/utils/build_step_context_mock/build_step_context_mock';
import { useJsonValidation } from './hooks/use_json_validation';

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
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const { validateJson, createSuggestionProvider, createHoverProvider } = useJsonValidation({
    schema: initialStepContextMock.schema,
  });

  useEffect(() => {
    if (editorRef.current) {
      const validation = validateJson(editorRef.current, inputsJson);
      setIsJsonValid(validation.isValid);
    }
  }, [inputsJson, validateJson]);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    // Trigger initial validation
    const validation = validateJson(editor, inputsJson);
    setIsJsonValid(validation.isValid);
  };

  const handleInputChange = (value: string) => {
    setInputsJson(value);
    if (editorRef.current) {
      const validation = validateJson(editorRef.current, value);
      setIsJsonValid(validation.isValid);
    }
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
        <EuiFlexGroup direction="row" gutterSize="l" css={styles.codeEditorWrapper}>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="l">
              <EuiFlexItem grow={false}>
                <CodeEditor
                  languageId="json"
                  value={inputsJson}
                  width={1000}
                  height={500}
                  editorDidMount={handleEditorDidMount}
                  onChange={handleInputChange}
                  suggestionProvider={createSuggestionProvider()}
                  hoverProvider={createHoverProvider()}
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
                    // Keep Monaco widgets within the modal bounds and add offset
                    fixedOverflowWidgets: true,
                    // Additional positioning configuration
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
                  <FormattedMessage
                    id="workflows.testStepModal.submitRunBtn"
                    defaultMessage="Run"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
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
