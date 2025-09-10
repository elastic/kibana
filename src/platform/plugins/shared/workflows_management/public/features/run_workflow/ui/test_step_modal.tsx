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
// import { useKibana } from '@kbn/kibana-react-plugin/public';
// import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { __findInputsInGraph, findInputsInGraph } from './find_inputs_in_graph/find_inputs_in_graph';

export function TestStepModal({
  stepId,
  workflowYaml,
  onClose,
  onSubmit,
}: {
  stepId: string;
  workflowYaml: string;
  onSubmit?: () => void;
  onClose: () => void;
}) {
  // const { services } = useKibana();
  // const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const modalTitleId = useGeneratedHtmlId();

  const stepExecutionGraph: WorkflowGraph | null = useMemo(() => {
    if (!workflowYaml) {
      return null;
    }
    let result = null;

    const parsingResult = parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
    if (parsingResult.error) {
      console.error('Error parsing workflow YAML:', parsingResult.error);
      return null;
    }
    console.log('Parsed workflow definition:', parsingResult.data);
    result = WorkflowGraph.fromWorkflowDefinition((parsingResult as any).data).getStepGraph(stepId);

    return result;
  }, [stepId, workflowYaml]);

  // useEffect(() => {
  //   console.log('inputsInGraph', findInputsInGraph(stepExecutionGraph!));
  //   console.log('stepExecutionGraph', stepExecutionGraph);
  // }, [stepExecutionGraph]);

  const subGraphInputs = useMemo(() => {
    if (!stepExecutionGraph) {
      return {};
    }
    const inputs = __findInputsInGraph(stepExecutionGraph);

    const stepInputs = inputs.reduce((stepAcc, inputPath) => {
      // Split the dot-separated path and create nested object structure
      const pathParts = inputPath.split('.');
      let current = stepAcc;

      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }

      // Set the final property with a placeholder value
      const finalPart = pathParts[pathParts.length - 1];
      current[finalPart] = `<${inputPath}>`;

      return stepAcc;
    }, {} as Record<string, any>);

    return stepInputs;
  }, [stepExecutionGraph]);

  // Get current user
  // useEffect(() => {
  //   const getCurrentUser = async () => {
  //     try {
  //       if (services.security) {
  //         const user = await services.security.authc.getCurrentUser();
  //         setCurrentUser(user);
  //       }
  //     } catch (error) {
  //       // eslint-disable-next-line no-console
  //       console.error('Failed to get current user:', error);
  //     }
  //   };

  //   getCurrentUser();
  // }, [services.security]);

  // const getDefaultWorkflowInputs = () => {
  //   const userEmail = currentUser?.email || 'workflow-user@gmail.com';
  //   const userName = currentUser?.username || 'workflow-user';
  //   return JSON.stringify(
  //     {
  //       event: {
  //         ruleName: 'Detect vulnerabilities',
  //         additionalData: {
  //           user: userEmail,
  //           userName,
  //         },
  //       },
  //     },
  //     null,
  //     2
  //   );
  // };

  // const [workflowEvent, setWorkflowEvent] = useState<string>(getDefaultWorkflowInputs());

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
                  // value={workflowEvent}
                  value={JSON.stringify(subGraphInputs, null, 2)}
                  width={500}
                  height={200}
                  editorDidMount={() => {}}
                  // onChange={setWorkflowEvent}
                  suggestionProvider={undefined}
                  dataTestSubj={'workflow-event-json-editor'}
                  options={{
                    language: 'json',
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <EuiButton iconType="play" onClick={onSubmit}>
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

