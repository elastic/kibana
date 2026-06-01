/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export interface WorkflowExecuteEventFormEmptyStateProps {
  isDefaultTriggerScope: boolean;
  onOpenManualTab?: () => void;
}

export const WorkflowExecuteEventFormEmptyState = memo(function WorkflowExecuteEventFormEmptyState({
  isDefaultTriggerScope,
  onOpenManualTab,
}: WorkflowExecuteEventFormEmptyStateProps): React.JSX.Element {
  const title = isDefaultTriggerScope ? (
    <FormattedMessage
      id="workflows.workflowExecuteEventTriggerForm.noEventsTitle"
      defaultMessage="No events in the selected time range"
    />
  ) : (
    <FormattedMessage
      id="workflows.workflowExecuteEventTriggerForm.noMatchingEventsTitle"
      defaultMessage="No events match your search"
    />
  );

  const body = isDefaultTriggerScope ? (
    <EuiText size="s" textAlign="center">
      <p>
        <FormattedMessage
          id="workflows.workflowExecuteEventTriggerForm.noEventsBody"
          defaultMessage="No events match this workflow's trigger scope in the selected time range. Try widening the time range or adjusting the query in the search bar, use the Manual tab to run with custom JSON, or trigger a real event and refresh."
        />
      </p>
    </EuiText>
  ) : (
    <EuiText size="s" textAlign="center">
      <p>
        <FormattedMessage
          id="workflows.workflowExecuteEventTriggerForm.noMatchingEventsBody"
          defaultMessage="Try widening the time range, adjusting the query in the search bar, or use the Manual tab to provide run input as JSON."
        />
      </p>
    </EuiText>
  );

  return (
    <EuiEmptyPrompt
      data-test-subj="workflowTriggerEventsEmptyState"
      iconType="calendar"
      title={<h3>{title}</h3>}
      body={body}
      actions={
        onOpenManualTab ? (
          <EuiButton
            size="s"
            onClick={onOpenManualTab}
            data-test-subj="workflowTriggerEventsOpenManualTab"
          >
            <FormattedMessage
              id="workflows.workflowExecuteEventTriggerForm.openManualTab"
              defaultMessage="Open Manual tab"
            />
          </EuiButton>
        ) : undefined
      }
      css={css`
        flex: 1;
        min-height: 0;
        justify-content: center;
      `}
      paddingSize="m"
      titleSize="xs"
    />
  );
});

WorkflowExecuteEventFormEmptyState.displayName = 'WorkflowExecuteEventFormEmptyState';
