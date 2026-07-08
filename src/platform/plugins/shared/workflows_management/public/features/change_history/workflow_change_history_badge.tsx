/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import React from 'react';
import type { ChangeHistoryBadgeRenderFn, ChangeHistoryListItem } from '@kbn/change-history-ui';

import { getWorkflowChangeHistoryRowDisplay } from './get_workflow_change_history_row_display';
import { VERSION_BADGE } from './translations';

const WorkflowChangeHistoryBadge = ({
  item,
}: {
  item: ChangeHistoryListItem;
}): JSX.Element | null => {
  const { euiTheme } = useEuiTheme();
  const display = getWorkflowChangeHistoryRowDisplay(item);

  if (display.kind === 'unsaved') {
    return (
      <EuiBadge
        color={euiTheme.colors.backgroundLightWarning}
        data-test-subj="workflowChangeHistoryUnsavedChangesBadge"
      >
        {display.badgeLabel}
      </EuiBadge>
    );
  }

  if (display.kind === 'current') {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        {display.badgeLabel ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="workflowChangeHistoryCurrentVersionBadge">
              {display.badgeLabel}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
        {display.version != null ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="workflowChangeHistoryVersionBadge">
              {VERSION_BADGE(display.version)}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }

  if (display.kind === 'version' && display.version != null) {
    return (
      <EuiBadge color="hollow" data-test-subj="workflowChangeHistoryVersionBadge">
        {VERSION_BADGE(display.version)}
      </EuiBadge>
    );
  }

  return null;
};

export const renderWorkflowChangeHistoryBadge: ChangeHistoryBadgeRenderFn = ({ item }) => (
  <WorkflowChangeHistoryBadge item={item} />
);
