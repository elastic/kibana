/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo } from 'react';
import { EuiTabs, EuiTab, EuiSpacer, EuiCodeBlock } from '@elastic/eui';
import { OverviewTab } from './overview_tab';
import type { MetricField } from '../../types';
import { TabTitleAndDescription } from './tab_title_and_description';

const tabs = (metric: MetricField, esqlQuery: string) => [
  {
    id: 'overview',
    name: 'Overview',
    content: <OverviewTab metric={metric} />,
  },
  {
    id: 'esql-query',
    name: 'ES|QL Query',
    content: (
      <>
        <TabTitleAndDescription metric={metric} />
        <EuiCodeBlock language="sql" fontSize="s" paddingSize="s" isCopyable>
          {esqlQuery}
        </EuiCodeBlock>
        <EuiSpacer size="m" />
      </>
    ),
  },
];

interface MetricFlyoutContentProps {
  metric: MetricField;
  esqlQuery: string;
}

export const MetricFlyoutContent = ({ metric, esqlQuery }: MetricFlyoutContentProps) => {
  const [selectedTabId, setSelectedTabId] = useState('overview');
  const metricTabs = useMemo(() => tabs(metric, esqlQuery), [esqlQuery, metric]);
  const selectedTabContent = useMemo(() => {
    return metricTabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [metricTabs, selectedTabId]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return metricTabs.map((tab, index) => (
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
      {selectedTabContent}
    </>
  );
};
