/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';
import { createHtmlPortalNode, type HtmlPortalNode } from 'react-reverse-portal';
import { useInternalStateSelector } from '../../state_management/redux';

export type ChartPortalNode = HtmlPortalNode;
export type ChartPortalNodes = Record<string, ChartPortalNode>;

export const useChartPortals = () => {
  const allTabIds = useInternalStateSelector((state) => state.tabs.allIds);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const chartPortalNodes = useRef<ChartPortalNodes>({});

  chartPortalNodes.current = updatePortals(chartPortalNodes.current, allTabIds);

  return {
    chartPortalNodes: chartPortalNodes.current,
    currentChartPortalNode: chartPortalNodes.current[currentTabId],
  };
};

const updatePortals = (portals: ChartPortalNodes, tabsIds: string[]) =>
  tabsIds.reduce<ChartPortalNodes>(
    (acc, tabId) => ({
      ...acc,
      [tabId]: portals[tabId] || createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } }),
    }),
    {}
  );
