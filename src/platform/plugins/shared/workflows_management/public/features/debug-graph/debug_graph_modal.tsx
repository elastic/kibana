/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { ExecutionGraph } from './execution_graph';

export interface DebugGraphModalProps {
  /**
   * The workflow YAML string to visualize in the debug graph
   */
  workflowYaml: string | undefined;
  /**
   * Callback function called when the modal is closed
   */
  onClose: () => void;
  /**
   * Optional title for the modal. Defaults to "Debug Workflow Graph"
   */
  title?: string;
}

export const DebugGraphModal: React.FC<DebugGraphModalProps> = ({
  workflowYaml,
  onClose,
  title = 'Debug Workflow Graph',
}) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'debugGraphModal' });

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={modalTitleId}
      maxWidth="90vw"
      style={{ height: '90vh' }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody style={{ height: 'calc(90vh - 120px)', width: '90vw', overflow: 'auto' }}>
        <ExecutionGraph workflowYaml={workflowYaml} />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={onClose} fill>
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
