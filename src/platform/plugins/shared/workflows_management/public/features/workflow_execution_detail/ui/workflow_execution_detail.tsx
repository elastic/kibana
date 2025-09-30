/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { ExecutionDetail } from './execution_detail';

export interface WorkflowExecutionProps {
  workflowExecutionId: string;
  workflowYaml: string;
  showBackButton?: boolean;
  fields?: Array<keyof EsWorkflowStepExecution>;
  onClose?: () => void;
}

export const WorkflowExecutionDetail: React.FC<WorkflowExecutionProps> = ({
  workflowExecutionId,
  workflowYaml,
  showBackButton = true,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();

  const { setSelectedStepExecution, selectedStepExecutionId, setSelectedStep } =
    useWorkflowUrlState();
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
        {showBackButton && (
          <EuiFlexItem grow={false}>
            <header
              css={css({
                minHeight: `32px`,
                display: 'flex',
                alignItems: 'center',
              })}
            >
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxs">
                    <EuiButtonEmpty
                      iconType="arrowLeft"
                      onClick={onClose}
                      size="xs"
                      aria-label={i18n.translate(
                        'workflows.workflowStepExecutionList.backToExecution',
                        {
                          defaultMessage: 'Back to executions',
                        }
                      )}
                    >
                      <FormattedMessage
                        id="workflows.workflowStepExecutionList.backToExecution"
                        defaultMessage="Back to executions"
                      />
                    </EuiButtonEmpty>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </header>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <ExecutionDetail
            workflowExecutionId={workflowExecutionId}
            workflowYaml={workflowYaml}
            selectedStepExecutionId={selectedStepExecutionId}
            setSelectedStep={setSelectedStep}
            setSelectedStepExecution={setSelectedStepExecution}
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
