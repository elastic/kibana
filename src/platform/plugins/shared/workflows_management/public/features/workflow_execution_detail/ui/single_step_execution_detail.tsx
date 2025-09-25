/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExecutionDetail } from './execution_detail';

export interface SingleStepExecution {
  stepExecutionId: string;
  workflowYaml: string;
  onClose?: () => void;
}

export const SingleStepExecution: React.FC<SingleStepExecution> = ({
  stepExecutionId: executionId,
  workflowYaml,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const [selectedStepExecutionId, setSelectedStepExecution] = useState<string | undefined>(
    undefined
  );

  return (
    <>
      <EuiFlexGroup
        css={css({
          padding: euiTheme.size.m,
          overflow: 'hidden',
        })}
        direction="column"
        justifyContent="flexStart"
        gutterSize="none"
      >
        <EuiFlexItem>
          <ExecutionDetail
            workflowExecutionId={executionId}
            workflowYaml={workflowYaml}
            selectedStepExecutionId={selectedStepExecutionId}
            setSelectedStep={() => {}}
            setSelectedStepExecution={setSelectedStepExecution as any}
            onClose={onClose}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={onClose}
            css={css({
              marginTop: 'auto',
              justifySelf: 'flex-end',
              flexShrink: 0,
            })}
          >
            <FormattedMessage id="workflows.workflowStepExecutionList.done" defaultMessage="Done" />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
