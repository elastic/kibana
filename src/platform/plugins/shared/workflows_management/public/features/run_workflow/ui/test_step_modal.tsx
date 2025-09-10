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
import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { buildStepContextMock } from './find_inputs_in_graph/find_inputs_in_graph';

export function TestStepModal({
  stepId,
  workflowYaml,
  onClose,
  onSubmit,
}: {
  stepId: string;
  workflowYaml: string;
  onSubmit?: (params: { stepInputs: Record<string, any> }) => void;
  onClose: () => void;
}) {
  const [inputsJson, setInputsJson] = React.useState<string>('');
  const [isJsonValid, setIsJsonValid] = React.useState<boolean>(true);
  const modalTitleId = useGeneratedHtmlId();

  const stepExecutionGraph: WorkflowGraph | null = useMemo(() => {
    if (!workflowYaml) {
      return null;
    }

    const parsingResult = parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
    return WorkflowGraph.fromWorkflowDefinition((parsingResult as any).data).getStepGraph(stepId);
  }, [stepId, workflowYaml]);

  useEffect(() => {
    if (!stepExecutionGraph) {
      return;
    }
    const stepContextMock = buildStepContextMock(stepExecutionGraph);

    setInputsJson(JSON.stringify(stepContextMock, null, 2));
  }, [stepExecutionGraph]);

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
                  width={500}
                  height={200}
                  editorDidMount={() => {}}
                  onChange={setInputsJson}
                  suggestionProvider={undefined}
                  dataTestSubj={'workflow-event-json-editor'}
                  options={{
                    language: 'json',
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <EuiButton iconType="play" disabled={!isJsonValid} onClick={handleSubmit}>
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
