/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
  formatDate,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { ExecutionStatus } from '@kbn/workflows';
import { getStatusLabel } from '../../../shared/translations';
import { FormattedRelativeEnhanced } from '../../../shared/ui/formatted_relative_enhanced/formatted_relative_enhanced';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import type { WorkflowRunPanelStatus } from '../lib/get_panel_status';
import { PRIVILEGE_LABELS, RUN_MESSAGES, STATUS_MESSAGES } from '../translations';

/** The callout shown instead of the run button when the panel cannot load its workflow. */
export const PanelStatusCallout = ({
  status,
}: {
  status: WorkflowRunPanelStatus;
}): React.JSX.Element | null => {
  switch (status.type) {
    case 'missing_privileges':
      return (
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={STATUS_MESSAGES.missingPrivilegesTitle}
          data-test-subj="workflowRunPanelMissingPrivileges"
        >
          {STATUS_MESSAGES.missingPrivilegesBody(
            status.privileges.map((privilege) => PRIVILEGE_LABELS[privilege]).join(', ')
          )}
        </KbnWarningCallout>
      );
    case 'not_found':
      return (
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={STATUS_MESSAGES.notFoundTitle}
          data-test-subj="workflowRunPanelNotFound"
        >
          {STATUS_MESSAGES.notFoundBody}
        </KbnWarningCallout>
      );
    case 'load_failed':
      return (
        <KbnDangerCallout announceOnMount size="s" title={STATUS_MESSAGES.loadFailedTitle}>
          {status.message}
        </KbnDangerCallout>
      );
    default:
      return null;
  }
};

interface ShownRun {
  id: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string;
}

interface LastRunStatusProps {
  run: ShownRun | undefined;
  isLoading: boolean;
  getHref: (executionId: string) => string;
}

/** The workflow's most recent run as a status icon and relative time that links to the execution. */
export const LastRunStatus = ({
  run,
  isLoading,
  getHref,
}: LastRunStatusProps): React.JSX.Element => {
  const { euiTheme } = useEuiTheme();
  if (!run) {
    return isLoading ? (
      <EuiLoadingSpinner size="s" />
    ) : (
      <EuiText size="xs" color="subdued" data-test-subj="workflowRunPanelNeverRun">
        {RUN_MESSAGES.neverRun}
      </EuiText>
    );
  }
  const date = run.finishedAt || run.startedAt;
  const statusLabel = getStatusLabel(run.status);
  return (
    <EuiToolTip content={`${statusLabel} · ${formatDate(date)}`}>
      <EuiLink
        href={getHref(run.id)}
        aria-label={`${RUN_MESSAGES.openLastRun}: ${statusLabel}`}
        data-test-subj="workflowRunPanelLastRunLink"
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
          <EuiFlexItem grow={false} data-test-subj="workflowRunPanelLastRunStatus">
            {getExecutionStatusIcon(euiTheme, run.status)}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              {RUN_MESSAGES.lastRun} <FormattedRelativeEnhanced value={date} style="narrow" />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiLink>
    </EuiToolTip>
  );
};
