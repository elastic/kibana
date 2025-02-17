/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiDescriptionList, EuiPanel, EuiTabbedContentTab, EuiTitle } from '@elastic/eui';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { ScrollableFlyoutTabbedContent, AlertFieldsTable } from '@kbn/alerts-ui-shared';
import { AdditionalContext, FlyoutSectionProps } from '../types';
import { defaultAlertsTableColumns } from '../configuration';
import { DefaultCellValue } from './default_cell_value';

export const DefaultAlertsFlyoutHeader = <AC extends AdditionalContext>({
  alert,
}: FlyoutSectionProps<AC>) => {
  return (
    <EuiTitle size="s">
      <h3>{(alert[ALERT_RULE_NAME]?.[0] as string) ?? 'Unknown'}</h3>
    </EuiTitle>
  );
};

type TabId = 'overview' | 'table';

export const DefaultAlertsFlyoutBody = <AC extends AdditionalContext>(
  props: FlyoutSectionProps<AC>
) => {
  const { alert, columns } = props;
  const overviewTab = useMemo(
    () => ({
      id: 'overview',
      'data-test-subj': 'overviewTab',
      name: i18n.translate('xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.overview', {
        defaultMessage: 'Overview',
      }),
      content: (
        <EuiPanel hasShadow={false} data-test-subj="overviewTabPanel">
          <EuiDescriptionList
            listItems={(columns ?? defaultAlertsTableColumns).map((column) => {
              const value = alert[column.id]?.[0];

              return {
                title: (column.displayAsText as string) ?? column.id,
                description:
                  value != null ? (
                    <DefaultCellValue columnId={column.id} alert={props.alert} />
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
    [alert, columns, props]
  );

  const tableTab = useMemo(
    () => ({
      id: 'table',
      'data-test-subj': 'tableTab',
      name: i18n.translate('xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.table', {
        defaultMessage: 'Table',
      }),
      content: (
        <EuiPanel hasShadow={false} data-test-subj="tableTabPanel">
          <AlertFieldsTable alert={alert} />
        </EuiPanel>
      ),
    }),
    [alert]
  );

  const tabs = useMemo(() => [overviewTab, tableTab], [overviewTab, tableTab]);
  const [selectedTabId, setSelectedTabId] = useState<TabId>('overview');
  const handleTabClick = useCallback(
    (tab: EuiTabbedContentTab) => setSelectedTabId(tab.id as TabId),
    []
  );

  const selectedTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [tabs, selectedTabId]
  );

  return (
    <ScrollableFlyoutTabbedContent
      tabs={tabs}
      selectedTab={selectedTab}
      onTabClick={handleTabClick}
      expand
      data-test-subj="defaultAlertFlyoutTabs"
    />
  );
};
