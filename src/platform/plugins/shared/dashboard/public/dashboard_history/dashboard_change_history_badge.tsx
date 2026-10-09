/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';

import type { ChangeHistoryBadgeRenderFn, ChangeHistoryListItem } from '@kbn/change-history-ui';
import { unsavedChangesBadgeStrings } from '../dashboard_app/_dashboard_app_strings';

const DashboardChangeHistoryBadge = ({
  item,
}: {
  item: ChangeHistoryListItem;
}): JSX.Element | null => {
  const { euiTheme } = useEuiTheme();

  if (item.metadata?.unsavedChanges) {
    return (
      <EuiBadge color={euiTheme.colors.backgroundLightWarning}>
        {unsavedChangesBadgeStrings.getUnsavedChangedBadgeText()}
      </EuiBadge>
    );
  }

  const version = item.metadata?.version as number | undefined;
  const versionBadge = version ? (
    <EuiBadge color="hollow">
      {i18n.translate('dashboard.changeHistory.versionBadge', {
        defaultMessage: 'v{version}',
        values: { version },
      })}
    </EuiBadge>
  ) : null;

  if (!item.isCurrent) return versionBadge;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {i18n.translate('dashboard.changeHistory.currentVersionOnlyBadge', {
            defaultMessage: 'Current version',
          })}
        </EuiBadge>
      </EuiFlexItem>
      {versionBadge ? <EuiFlexItem grow={false}>{versionBadge}</EuiFlexItem> : null}
    </EuiFlexGroup>
  );
};

export const renderDashboardChangeHistoryBadge: ChangeHistoryBadgeRenderFn = ({ item }) => (
  <DashboardChangeHistoryBadge item={item} />
);
