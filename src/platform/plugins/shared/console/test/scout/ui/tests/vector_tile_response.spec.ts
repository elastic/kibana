/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SAMPLE_DATA_SET = 'logs';

test.describe('Console vector tile response', { tag: tags.deploymentAgnostic }, () => {
  // The sample data set installs cluster-wide indices, so it is set up once for the file
  // rather than per test.
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.sampleData.install(SAMPLE_DATA_SET);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.clearEditorText();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.sampleData.remove(SAMPLE_DATA_SET);
  });

  test('renders a binary vector tile response as text', async ({ pageObjects }) => {
    await pageObjects.console.enterText('GET kibana_sample_data_logs/_mvt/geo.coordinates/0/0/0');
    await pageObjects.console.sendRequest();

    await expect(pageObjects.console.outputEditorContent).toContainText('"meta": [');
  });
});
