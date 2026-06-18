/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage, ScoutTestFixtures } from '@kbn/scout';
import {
  addFieldColumn,
  changeVisShape,
  createDataViewFromSearchBar,
  saveDiscoverSession,
  submitQuery,
} from './helpers';
import { AD_HOC_TAB, ESQL_TAB, PERSISTED_TAB } from './discover_session_test_data';

export const createMultiTabDiscoverSession = async (
  pageObjects: ScoutTestFixtures['pageObjects'],
  page: ScoutPage,
  sessionName: string
) => {
  const { discover, datePicker } = pageObjects;

  await datePicker.setAbsoluteRange(PERSISTED_TAB.time);
  await pageObjects.queryBar.setQuery(PERSISTED_TAB.query);
  await submitQuery(page);
  await discover.waitUntilSearchingHasFinished();
  await addFieldColumn(page, PERSISTED_TAB.column1);
  await discover.editTabLabel(0, PERSISTED_TAB.label);
  await discover.setChartInterval(PERSISTED_TAB.chartIntervalTitle);

  await discover.createNewTab();
  await discover.waitUntilSearchingHasFinished();
  await datePicker.setAbsoluteRange(AD_HOC_TAB.time);
  await createDataViewFromSearchBar(page, {
    name: 'logs',
    adHoc: true,
    hasTimeField: true,
  });
  await discover.waitUntilSearchingHasFinished();
  await pageObjects.queryBar.setQuery(AD_HOC_TAB.query);
  await submitQuery(page);
  await discover.waitUntilSearchingHasFinished();
  await addFieldColumn(page, AD_HOC_TAB.column1);
  await discover.editTabLabel(1, AD_HOC_TAB.label);

  await discover.createNewTab();
  await discover.waitUntilSearchingHasFinished();
  await datePicker.setAbsoluteRange(ESQL_TAB.time);
  await discover.writeAndSubmitEsqlQuery(ESQL_TAB.query);
  await changeVisShape(page, ESQL_TAB.visShape);
  await discover.editTabLabel(2, ESQL_TAB.label);

  await discover.selectTabByIndex(0);
  await saveDiscoverSession(page, sessionName, { storeTimeRange: true });
};
