/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiPanel, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW } from '../../../common';

export interface WorkflowExecutionsTableEndOfResultsProps {
  onTimeRangeLinkClick?: () => void;
}

export const WorkflowExecutionsTableEndOfResults =
  React.memo<WorkflowExecutionsTableEndOfResultsProps>(({ onTimeRangeLinkClick }) => {
    return (
      <EuiPanel
        color="subdued"
        hasBorder={false}
        hasShadow={false}
        paddingSize="s"
        data-test-subj="executionsTableEndOfResults"
      >
        <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="info" size="s" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <FormattedMessage
                id="workflowsManagement.executionsPage.table.endOfResults"
                defaultMessage="You've reached the first {maxResults} executions. {timeRangeLink} to see older executions."
                values={{
                  maxResults: WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW.toLocaleString(),
                  timeRangeLink: (
                    <EuiLink
                      onClick={onTimeRangeLinkClick}
                      data-test-subj="executionsTableNarrowTimeRange"
                    >
                      <FormattedMessage
                        id="workflowsManagement.executionsPage.table.narrowTimeRange"
                        defaultMessage="Narrow the time range"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  });

WorkflowExecutionsTableEndOfResults.displayName = 'WorkflowExecutionsTableEndOfResults';
