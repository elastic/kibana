/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import type { ChangeHistoryBadgeRenderFn } from '@kbn/change-history-ui';

import { CURRENT_VERSION_ONLY_BADGE, VERSION_BADGE } from './translations';

export const renderWorkflowChangeHistoryBadge: ChangeHistoryBadgeRenderFn = ({ item }) => {
  const version = item.metadata?.version;

  if (item.isCurrent) {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="workflowChangeHistoryCurrentVersionBadge">
            {CURRENT_VERSION_ONLY_BADGE}
          </EuiBadge>
        </EuiFlexItem>
        {typeof version === 'number' ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="workflowChangeHistoryVersionBadge">
              {VERSION_BADGE(version)}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }

  if (typeof version !== 'number') {
    return null;
  }

  return (
    <EuiBadge color="hollow" data-test-subj="workflowChangeHistoryVersionBadge">
      {VERSION_BADGE(version)}
    </EuiBadge>
  );
};
