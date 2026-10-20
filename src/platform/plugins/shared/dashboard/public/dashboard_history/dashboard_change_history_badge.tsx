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
import { DASHBOARD_DELETE_ACTION, DASHBOARD_UNSAVED_CHANGES_ACTION } from '../../common/constants';
import { unsavedChangesBadgeStrings } from '../dashboard_app/_dashboard_app_strings';

const DashboardChangeHistoryBadge = ({
  item,
}: {
  item: ChangeHistoryListItem;
}): JSX.Element | null => {
  const { euiTheme } = useEuiTheme();

  if (item.action === DASHBOARD_UNSAVED_CHANGES_ACTION) {
    return (
      <EuiBadge color={euiTheme.colors.backgroundLightWarning}>
        {unsavedChangesBadgeStrings.getUnsavedChangedBadgeText()}
      </EuiBadge>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
      {item.isCurrent && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('dashboard.changeHistory.currentVersionBadge', {
              defaultMessage: 'Current version',
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {item.action === DASHBOARD_DELETE_ACTION && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger">
            {i18n.translate('dashboard.changeHistory.deletedBadge', {
              defaultMessage: 'Deleted',
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {typeof item.metadata?.version === 'number' && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('dashboard.changeHistory.versionBadge', {
              defaultMessage: 'v{version}',
              values: { version: item.metadata.version },
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const renderDashboardChangeHistoryBadge: ChangeHistoryBadgeRenderFn = ({ item }) => (
  <DashboardChangeHistoryBadge item={item} />
);
