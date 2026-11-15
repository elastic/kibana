/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import React from 'react';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { ExecutionStatus } from '@kbn/workflows';
import { StatusBadge } from '../../../shared/ui/status_badge';
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

interface LastRunLineProps {
  run: ShownRun | undefined;
  isOwnRun: boolean;
  isLoading: boolean;
  getHref: (executionId: string) => string;
}

/** The status of the viewer's own run, or else the workflow's most recent run, with a link to it. */
export const LastRunLine = ({
  run,
  isOwnRun,
  isLoading,
  getHref,
}: LastRunLineProps): React.JSX.Element => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {isOwnRun ? RUN_MESSAGES.yourRun : RUN_MESSAGES.lastRun}
      </EuiText>
    </EuiFlexItem>
    {run ? (
      <>
        <EuiFlexItem grow={false} data-test-subj="workflowRunPanelLastRunStatus">
          <StatusBadge status={run.status} date={run.finishedAt || run.startedAt} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink href={getHref(run.id)} data-test-subj="workflowRunPanelLastRunLink">
            <EuiText size="xs">{RUN_MESSAGES.viewExecution}</EuiText>
          </EuiLink>
        </EuiFlexItem>
      </>
    ) : (
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {isLoading ? <EuiLoadingSpinner size="s" /> : RUN_MESSAGES.neverRun}
        </EuiText>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
