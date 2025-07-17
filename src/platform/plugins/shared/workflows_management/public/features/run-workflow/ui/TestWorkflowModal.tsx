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
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { WorkflowExecution } from '../../workflow-detail/ui/workflow-execution';

export function TestWorkflowModal({
  workflowYaml,
  onClose,
}: {
  workflowYaml: string;
  onClose: () => void;
}) {
  const { services } = useKibana();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [workflowExecutionId, setWorkflowExecutionId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        if (services.security) {
          const user = await services.security.authc.getCurrentUser();
          console.log(user);
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    };

    getCurrentUser();
  }, [services.security]);

  const getDefaultWorkflowInputs = () => {
    const userEmail = currentUser?.email || 'workflow-user@gmail.com';
    const userName = currentUser?.username || 'workflow-user';
    return JSON.stringify(
      {
        event: {
          ruleName: 'Detect vulnerabilities',
          additionalData: {
            user: userEmail,
            userName,
          },
        },
      },
      null,
      2
    );
  };

  const handleSubmit = () => {
    services.http
      ?.post('/api/workflows/test', {
        body: JSON.stringify({
          workflowYaml,
          inputs: workflowEvent,
        }),
      })
      .then((res: any) => {
        console.log('Workflow run response:', res);
        setWorkflowExecutionId(res.workflowExecutionId);
      });
  };

  useEffect(() => {
    handleSubmit();
  }, []);

  const [workflowEvent, setWorkflowEvent] = useState<string>(getDefaultWorkflowInputs());

  return (
    <EuiModal maxWidth={false} onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Test Workflow</EuiModalHeaderTitle>
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
                  value={workflowEvent}
                  width={500}
                  height={200}
                  editorDidMount={() => {}}
                  onChange={setWorkflowEvent}
                  suggestionProvider={undefined}
                  dataTestSubj={'workflow-event-json-editor'}
                  options={{
                    language: 'json',
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <EuiButton onClick={handleSubmit}>Test Workflow</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {workflowExecutionId && (
            <EuiFlexItem>
              <WorkflowExecution
                workflowExecutionId={workflowExecutionId}
                workflowYaml={workflowYaml}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiModalBody>
    </EuiModal>
  );
}
