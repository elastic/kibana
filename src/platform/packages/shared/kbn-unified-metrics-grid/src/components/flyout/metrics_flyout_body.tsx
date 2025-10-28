/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { OverviewTab } from './overview_tab';
import { EsqlQueryTab } from './esql_query_tab';

const tabIds = {
  OVERVIEW: 'overview',
  ESQL_QUERY: 'esql-query',
} as const;

type TabId = (typeof tabIds)[keyof typeof tabIds];

const OverviewTabName = i18n.translate('metricsExperience.metricFlyout.overviewTab', {
  defaultMessage: 'Overview',
});

const EsqlQueryTabName = i18n.translate('metricsExperience.metricFlyout.esqlQueryTab', {
  defaultMessage: 'ES|QL Query',
});

const tabs = [
  {
    id: tabIds.OVERVIEW,
    name: OverviewTabName,
  },
  {
    id: tabIds.ESQL_QUERY,
    name: EsqlQueryTabName,
  },
];

interface MetricFlyoutBodyProps {
  metric: MetricField;
  description?: string;
  esqlQuery?: string;
}

export const MetricFlyoutBody = ({ metric, esqlQuery, description }: MetricFlyoutBodyProps) => {
  const [selectedTabId, setSelectedTabId] = useState<TabId>(tabIds.OVERVIEW);

  const onSelectedTabChanged = (id: TabId) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <>
      <EuiTabs size="s">{renderTabs()}</EuiTabs>
      {selectedTabId === tabIds.OVERVIEW && (
        <OverviewTab metric={metric} description={description} />
      )}
      {selectedTabId === tabIds.ESQL_QUERY && (
        <EsqlQueryTab esqlQuery={esqlQuery} metric={metric} />
      )}
    </>
  );
};
