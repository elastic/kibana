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
  console.log({ item });
  if (item.metadata?.unsavedChanges) {
    return (
      <EuiBadge color={euiTheme.colors.backgroundLightWarning}>
        {unsavedChangesBadgeStrings.getUnsavedChangedBadgeText()}
      </EuiBadge>
    );
  }

  if (item.isCurrent) {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('dashboard.changeHistory.currentVersionOnlyBadge', {
              defaultMessage: 'Current version',
            })}
          </EuiBadge>
        </EuiFlexItem>
        {item.metadata?.version ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('dashboard.changeHistory.versionBadge', {
                defaultMessage: 'v{version}',
                values: { version: item.metadata!.version as number },
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }

  if (item.metadata!.version) {
    return (
      <EuiBadge color="hollow">
        {i18n.translate('dashboard.changeHistory.versionBadge', {
          defaultMessage: 'v{version}',
          values: { version: item.metadata!.version as number },
        })}
      </EuiBadge>
    );
  }

  return null;
};

export const renderDashboardChangeHistoryBadge: ChangeHistoryBadgeRenderFn = ({ item }) => (
  <DashboardChangeHistoryBadge item={item} />
);
