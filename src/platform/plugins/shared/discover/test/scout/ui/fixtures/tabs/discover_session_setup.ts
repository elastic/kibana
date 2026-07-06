/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutTestFixtures } from '@kbn/scout';
import { AD_HOC_TAB, ESQL_TAB, PERSISTED_TAB } from './discover_session_test_data';

/**
 * Builds a three-tab Discover session (persisted data view, ad hoc data view,
 * and ES|QL) without saving. Kept as a single source of truth so the "saving"
 * test and the load/unsaved-changes setup share the exact same tab sequence.
 */
export const buildMultiTabSession = async (pageObjects: ScoutTestFixtures['pageObjects']) => {
  const { discover, datePicker, queryBar, unifiedTabs, unifiedFieldList } = pageObjects;

  await datePicker.setAbsoluteRange(PERSISTED_TAB.time);
  await queryBar.setQuery(PERSISTED_TAB.query);
  await discover.submitQuery();
  await discover.waitUntilTabIsLoaded();
  await unifiedFieldList.clickFieldListItemAdd(PERSISTED_TAB.column1);
  await unifiedTabs.editTabLabel(0, PERSISTED_TAB.label);
  await discover.setChartInterval(PERSISTED_TAB.chartIntervalTitle);

  await unifiedTabs.createNewTab();
  await discover.waitUntilTabIsLoaded();
  await datePicker.setAbsoluteRange(AD_HOC_TAB.time);
  await discover.createDataViewFromSearchBar({ name: 'logs', adHoc: true });
  await discover.waitUntilTabIsLoaded();
  await queryBar.setQuery(AD_HOC_TAB.query);
  await discover.submitQuery();
  await discover.waitUntilTabIsLoaded();
  await unifiedFieldList.clickFieldListItemAdd(AD_HOC_TAB.column1);
  await unifiedTabs.editTabLabel(1, AD_HOC_TAB.label);

  await unifiedTabs.createNewTab();
  await discover.waitUntilTabIsLoaded();
  await datePicker.setAbsoluteRange(ESQL_TAB.time);
  await discover.writeAndSubmitEsqlQuery(ESQL_TAB.query);
  await discover.changeHistogramVisShape(ESQL_TAB.visShape);
  await unifiedTabs.editTabLabel(2, ESQL_TAB.label);
};

/**
 * Builds the three-tab session and saves it (with its time range) under
 * `sessionName`, leaving the first tab active.
 */
export const createMultiTabDiscoverSession = async (
  pageObjects: ScoutTestFixtures['pageObjects'],
  sessionName: string
) => {
  const { discover, unifiedTabs } = pageObjects;

  await buildMultiTabSession(pageObjects);
  await unifiedTabs.selectTab(0);
  await discover.saveSearch(sessionName, { storeTimeRange: true });
};
