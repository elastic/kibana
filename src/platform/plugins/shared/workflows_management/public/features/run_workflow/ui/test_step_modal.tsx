/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
import { CodeEditor } from '@kbn/code-editor';
import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import type { monaco } from '@kbn/monaco';
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
        <EuiModalHeaderTitle id={modalTitleId}>Test Step</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup
          direction="row"
          gutterSize="l"
          css={css`
            height: 100%;
            overflow: auto;
          `}
        >
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
                    // Disable Monaco's built-in problem UI that causes positioning issues in modals
                    quickSuggestions: false,
                    lightbulb: {
                      enabled: false,
                    },
                    fixedOverflowWidgets: true, // Keep widgets within editor bounds
                    scrollBeyondLastLine: false,
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
                  Run
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
    </EuiModal>
  );
}
