/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { WorkflowExecutionList } from './workflow_execution_list_stateful';

export interface WorkflowExecutionListFlyoutProps {
  workflowId: string;
  onClose: () => void;
  /** Keep mounted but collapse out of the push layout while detail is shown. */
  isHidden?: boolean;
}

export const WorkflowExecutionListFlyout = ({
  workflowId,
  onClose,
  isHidden = false,
}: WorkflowExecutionListFlyoutProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlyout
      onClose={onClose}
      // Overlay when hidden so the detail push-flyout owns the layout slot.
      type={isHidden ? 'overlay' : 'push'}
      paddingSize="none"
      hideCloseButton
      ownFocus={!isHidden}
      style={
        isHidden
          ? {
              display: 'none',
            }
          : { minWidth: '480px', maxWidth: '480px' }
      }
      data-test-subj="workflowExecutionListFlyout"
      aria-hidden={isHidden}
    >
      <EuiFlyoutHeader>
        <EuiFlexGroup
          justifyContent="flexEnd"
          alignItems="center"
          gutterSize="none"
          responsive={false}
          css={{
            height: '36px',
            padding: '0 8px',
            borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
          }}
        >
          <EuiButtonIcon
            iconType="cross"
            aria-label={i18n.translate('workflows.executionListFlyout.close', {
              defaultMessage: 'Close',
            })}
            color="text"
            size="s"
            onClick={onClose}
          />
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflowContent {
            padding: 0;
          }
        `}
      >
        <WorkflowExecutionList workflowId={workflowId} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
