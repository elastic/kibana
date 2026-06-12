/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ParsedMetricItem } from '../../types';
import type { FlyoutTabId } from '../../restorable_state';
import { useMetricsExperienceState } from '../observability/metrics/context/metrics_experience_state_provider';
import { OverviewTab, EsqlQueryTab } from './tabs';

const tabIds = {
  OVERVIEW: 'overview',
  ESQL_QUERY: 'esql-query',
} as const satisfies Record<string, FlyoutTabId>;

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
    'data-test-subj': 'metricsExperienceFlyoutOverviewTab',
  },
  {
    id: tabIds.ESQL_QUERY,
    name: EsqlQueryTabName,
    'data-test-subj': 'metricsExperienceFlyoutEsqlQueryTab',
  },
];

interface MetricFlyoutBodyProps {
  metricItem: ParsedMetricItem;
  description?: string;
  esqlQuery?: string;
}

export const MetricFlyoutBody = ({ metricItem, esqlQuery, description }: MetricFlyoutBodyProps) => {
  const { flyoutState, onFlyoutSelectedTabChange } = useMetricsExperienceState();
  const selectedTabId: FlyoutTabId = flyoutState?.selectedTabId ?? tabIds.OVERVIEW;

  const onSelectedTabChanged = (id: FlyoutTabId) => {
    onFlyoutSelectedTabChange(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        data-test-subj={tab['data-test-subj']}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <>
      <EuiTabs size="s">{renderTabs()}</EuiTabs>
      {selectedTabId === tabIds.OVERVIEW && (
        <OverviewTab metricItem={metricItem} description={description} />
      )}
      {selectedTabId === tabIds.ESQL_QUERY && (
        <EsqlQueryTab esqlQuery={esqlQuery} metricItem={metricItem} />
      )}
    </>
  );
};
