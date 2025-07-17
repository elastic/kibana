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

export function WorkflowEventModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (event: Record<string, any>) => void;
}) {
  const { services } = useKibana();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);

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
    onSubmit(JSON.parse(workflowEvent));
    onClose();
  };

  const [workflowEvent, setWorkflowEvent] = useState<string>(getDefaultWorkflowInputs());

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Run Workflow</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem>
            <CodeEditor
              languageId="json"
              value={workflowEvent}
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
          <EuiFlexItem>
            <EuiButton onClick={handleSubmit}>Run Workflow</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
    </EuiModal>
  );
}
