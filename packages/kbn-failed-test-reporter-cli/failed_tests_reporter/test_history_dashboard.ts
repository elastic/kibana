/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeTestID } from '@kbn/scout-reporting';

import type { TestFailure } from './get_failures';
import { getLocationFromClassname } from './get_failures';
import type { ScoutTestFailureExtended } from './get_scout_failures';

const DASHBOARD_URL = 'https://ops.kibana.dev/s/ci/app/dashboards#/view/ci-test-history-ftr-scout';
const LINK_LABEL = 'Test history: [passes and failures over time]';

const risonString = (value: string): string => `'${value.replace(/!/g, '!!').replace(/'/g, "!'")}'`;

/** Link an FTR, Jest, or Scout failure to its test history in the test-event stream. */
export const testHistoryDashboardUrl = (
  failure: TestFailure | ScoutTestFailureExtended
): string | undefined => {
  let testId: string;

  if ('id' in failure && failure.id) {
    testId = failure.id;
  } else if (failure.testType === 'ftr' || failure.testType === 'jest') {
    const filePath =
      failure.testType === 'jest' ? failure.location : getLocationFromClassname(failure.classname);
    if (!filePath || !/\.[cm]?[jt]sx?$/.test(filePath) || !failure.name) return;

    testId = computeTestID(filePath, failure.name);
  } else {
    return;
  }

  const globalState = '(time:(from:now-30d,to:now))';
  const appState = `(query:(language:kuery,query:${risonString(
    `test.id : ${JSON.stringify(testId)}`
  )}))`;
  return `${DASHBOARD_URL}?_g=${encodeURIComponent(globalState)}&_a=${encodeURIComponent(
    appState
  )}`;
};

/** Insert or refresh the dashboard link before the issue's machine-readable metadata. */
export const withTestHistoryDashboardLink = (
  body: string,
  failure: TestFailure | ScoutTestFailureExtended
): string => {
  const url = testHistoryDashboardUrl(failure);
  if (!url) return body;

  const link = `${LINK_LABEL}(${url})`;
  const existingLink = /Test history: \[passes and failures over time\]\([^\n]+\)/;
  if (existingLink.test(body)) return body.replace(existingLink, link);

  const metadataStart = body.lastIndexOf('\n\n<!-- kibanaCiData = ');
  if (metadataStart < 0) return `${body}\n\n${link}`;
  return `${body.slice(0, metadataStart)}\n\n${link}${body.slice(metadataStart)}`;
};
