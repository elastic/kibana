/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { type ApprovalLabels, ResumeExecutionButton } from './resume_execution_button';

export interface WaitingStepAction {
  stepExecutionId: string;
  message?: string;
  executionId: string;
  workflowId?: string;
  stepStartedAt?: string;
  resumeSchema?: JsonModelSchemaType;
  approvalLabels?: ApprovalLabels;
  autoOpen?: boolean;
  submitState?: React.ComponentProps<typeof ResumeExecutionButton>['submitState'];
}

interface WaitingStepActionPanelProps {
  action: WaitingStepAction;
  /** Accessible name for the region (visually hidden). */
  ariaLabel: string;
}

const defaultMessage = i18n.translate(
  'workflows.executionFlyout.waitingStep.userActionRequiredDescription',
  { defaultMessage: 'User action is required' }
);

/**
 * Inline waiting-step details under a tree row. Message-first, matching the
 * failed-step error panel: description plus a Provide action (or approve/reject) CTA.
 */
export const WaitingStepActionPanel = React.memo<WaitingStepActionPanelProps>(
  ({ action, ariaLabel }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <div
        role="region"
        aria-label={ariaLabel}
        data-test-subj="workflowWaitingStepActionPanel"
        css={{
          marginTop: euiTheme.size.xs,
          padding: euiTheme.size.s,
          borderTop: `1px solid ${euiTheme.colors.borderBaseWarning}`,
        }}
      >
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <EuiText size="xs" color="warning" data-test-subj="workflowWaitingStepActionMessage">
            <p>{action.message ?? defaultMessage}</p>
          </EuiText>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            css={{ marginTop: euiTheme.size.s }}
          >
            <EuiFlexItem grow={false}>
              <ResumeExecutionButton
                appearance="button"
                executionId={action.executionId}
                workflowId={action.workflowId}
                stepStartedAt={action.stepStartedAt}
                resumeMessage={action.message}
                resumeSchema={action.resumeSchema}
                approvalLabels={action.approvalLabels}
                autoOpen={action.autoOpen}
                waitingStepExecutionId={action.stepExecutionId}
                submitState={action.submitState}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }
);

WaitingStepActionPanel.displayName = 'WaitingStepActionPanel';
