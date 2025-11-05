/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiTitle,
  EuiPanel,
  EuiDescriptionList,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { ALERT_RULE_CATEGORY, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { JsonValue } from '@kbn/utility-types';
import { AlertFieldsTable, ScrollableFlyoutTabbedContent } from '@kbn/alerts-ui-shared';
import type { Alert } from '@kbn/alerting-types';
import { defaultAlertsTableColumns } from '../configuration';
import { DefaultCellValue } from './default_cell_value';
import type { AdditionalContext, RenderContext } from '../types';
import * as i18n from '../translations';

type TabId = 'overview' | 'table';

export const AlertDetailFlyout = ({
  pageSize,
  pageIndex,
  expandedAlertIndex,
  onExpandedAlertIndexChange,
  alerts,
  alertsCount,
  isLoading,
  columns,
  openLinksInNewTab,
  ownFocus = false,
  hasPagination = true,
}: Omit<RenderContext<AdditionalContext>, 'expandedAlertIndex'> & {
  expandedAlertIndex: number;
  ownFocus?: boolean;
  hasPagination?: boolean;
}) => {
  const alertIndexInPage = expandedAlertIndex - pageIndex * pageSize;
  const expandedAlertPage = Math.floor(expandedAlertIndex / pageSize);
  // This can be undefined when a new page of alerts is still loading
  const alert = alerts[alertIndexInPage] as Alert | undefined;

  const ariaLabel =
    alert && alert[ALERT_RULE_CATEGORY]
      ? i18n.getAlertFlyoutAriaLabel(String(alert[ALERT_RULE_CATEGORY]))
      : i18n.ALERT_FLYOUT_DEFAULT_TITLE;

  const overviewTab = useMemo(
    () => ({
      id: 'overview',
      'data-test-subj': 'alertFlyoutOverviewTab',
      name: i18n.ALERT_FLYOUT_OVERVIEW_TAB_TITLE,
      content: alert && (
        <EuiPanel hasShadow={false} data-test-subj="alertFlyoutOverviewTabPanel">
          <EuiDescriptionList
            listItems={(columns ?? defaultAlertsTableColumns).map((column) => {
              const value = (alert[column.id] as JsonValue[])?.[0];

              return {
                title: (column.displayAsText as string) ?? column.id,
                description:
                  value != null ? (
                    <DefaultCellValue
                      columnId={column.id}
                      alert={alert}
                      openLinksInNewTab={openLinksInNewTab}
                    />
                  ) : (
                    '—'
                  ),
              };
            })}
            type="column"
            columnWidths={[1, 3]}
          />
        </EuiPanel>
      ),
    }),
    [alert, columns, openLinksInNewTab]
  );

  const tableTab = useMemo(
    () => ({
      id: 'table',
      'data-test-subj': 'alertFlyoutTableTab',
      name: i18n.ALERT_FLYOUT_TABLE_TAB_TITLE,
      content: alert && (
        <EuiPanel hasShadow={false} data-test-subj="alertFlyoutTableTabPanel">
          <AlertFieldsTable alert={alert} />
        </EuiPanel>
      ),
    }),
    [alert]
  );

  const tabs = useMemo(() => [overviewTab, tableTab], [overviewTab, tableTab]);
  const [selectedTabId, setSelectedTabId] = useState<TabId>('overview');

  const selectedTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [tabs, selectedTabId]
  );

  if (alertIndexInPage < 0 || alertIndexInPage >= alerts.length || pageSize <= 0) {
    onExpandedAlertIndexChange(null);
    return null;
  }

  return (
    <EuiFlyout
      onClose={() => {
        onExpandedAlertIndexChange(null);
      }}
      size="m"
      data-test-subj="alertFlyout"
      aria-label={ariaLabel}
      ownFocus={ownFocus}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            {!isLoading && alert
              ? (alert[ALERT_RULE_NAME]?.[0] as string)
              : i18n.ALERT_FLYOUT_DEFAULT_TITLE}
          </h3>
        </EuiTitle>
        {Boolean(hasPagination) && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiPagination
                  aria-label={i18n.ALERT_FLYOUT_PAGINATION_ARIA_LABEL}
                  pageCount={alertsCount}
                  activePage={expandedAlertIndex}
                  onPageClick={(activePage) => {
                    onExpandedAlertIndexChange(activePage);
                  }}
                  compressed
                  data-test-subj="alertFlyoutPagination"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutHeader>

      {isLoading ? (
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" data-test-subj="alertFlyoutLoading" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        alert &&
        expandedAlertPage === pageIndex && (
          <ScrollableFlyoutTabbedContent
            tabs={tabs}
            selectedTab={selectedTab}
            onTabClick={(tab) => setSelectedTabId(tab.id as TabId)}
            expand
            data-test-subj="alertFlyoutTabs"
          />
        )
      )}
    </EuiFlyout>
  );
};

// Lazy loading helpers
// eslint-disable-next-line import/no-default-export
export { AlertDetailFlyout as default };
export type AlertDetailFlyout = typeof AlertDetailFlyout;
