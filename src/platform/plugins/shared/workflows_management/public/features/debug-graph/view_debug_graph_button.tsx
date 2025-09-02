/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import '@xyflow/react/dist/style.css';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DebugGraphModal } from './debug_graph_modal';

export interface WorkflowExecutionProps {
  workflowYaml: string | undefined;
}

export const ViewDebugGraphButton: React.FC<WorkflowExecutionProps> = ({ workflowYaml }) => {
  const [isModalOpen, setModalOpen] = React.useState<boolean>(false);

  console.log(workflowYaml)

  return (
    <>
      <EuiToolTip content={'View execution graph'}>
        <EuiButtonIcon
          display="base"
          iconType="inspect"
          size="s"
          disabled={false}
          onClick={() => setModalOpen(true)}
          title={undefined}
          aria-label={i18n.translate(
            'workflows.workflowDetailHeader.viewExecutionGraph.ariaLabel',
            {
              defaultMessage: 'Inspect execution graph',
            }
          )}
        />
      </EuiToolTip>
      {isModalOpen && (
        <DebugGraphModal
          workflowYaml={workflowYaml}
          onClose={() => setModalOpen(false)}
          title="Inspect workflow execution graph"
        />
      )}
    </>
  );
};
