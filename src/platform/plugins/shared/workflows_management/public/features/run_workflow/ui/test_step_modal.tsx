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
import React, { useEffect } from 'react';
import { css } from '@emotion/react';
import type { StepContext } from '@kbn/workflows';

export function TestStepModal({
  initialStepContextMock,
  onClose,
  onSubmit,
}: {
  initialStepContextMock: Partial<StepContext>;
  onSubmit?: (params: { stepInputs: Record<string, any> }) => void;
  onClose: () => void;
}) {
  const [inputsJson, setInputsJson] = React.useState<string>(
    JSON.stringify(initialStepContextMock, null, 2)
  );
  const [isJsonValid, setIsJsonValid] = React.useState<boolean>(true);
  const modalTitleId = useGeneratedHtmlId();

  useEffect(() => {
    try {
      JSON.parse(inputsJson);
      setIsJsonValid(true);
    } catch (e) {
      setIsJsonValid(false);
    }
  }, [inputsJson]);

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
                  editorDidMount={() => {}}
                  onChange={setInputsJson}
                  suggestionProvider={undefined}
                  dataTestSubj={'workflow-event-json-editor'}
                  options={{
                    language: 'json',
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
