/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('SQL search example', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.searchExamples.gotoSqlSearch();
  });

  test('should search', async ({ page, pageObjects }) => {
    const { searchExamples } = pageObjects;
    const sqlQuery = `SELECT index, bytes FROM "logstash-*" ORDER BY "@timestamp" DESC`;

    await test.step('submit SQL query', async () => {
      await searchExamples.sqlQueryInput.fill(sqlQuery);
      await searchExamples.querySubmitButton.click();
    });

    await test.step('assert request and response', async () => {
      await expect(searchExamples.requestCodeBlock).toContainText(JSON.stringify(sqlQuery));
      await expect(searchExamples.responseCodeBlock).toContainText('"logstash-2015.09.22"');
      await expect(page.components.toast().toasts).toHaveCount(0);
    });
  });
});
