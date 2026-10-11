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

// Unique per run so cleanup can't touch anyone else's index.
const INDEX_NAME = `console-vector-tile-fixture-${Math.random().toString(36).slice(2)}`;
const GEO_FIELD = 'location';

test.describe('Console vector tile response', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.indices.create({
      index: INDEX_NAME,
      mappings: { properties: { [GEO_FIELD]: { type: 'geo_point' } } },
    });
    await esClient.index({
      index: INDEX_NAME,
      document: { [GEO_FIELD]: { lat: 40.4168, lon: -3.7038 } },
      refresh: true,
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.clearEditorText();
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
  });

  test('renders a binary vector tile response as text', async ({ pageObjects }) => {
    await pageObjects.console.enterText(`GET ${INDEX_NAME}/_mvt/${GEO_FIELD}/0/0/0`);
    await pageObjects.console.sendRequest();

    await expect(pageObjects.console.outputEditorContent).toContainText('"meta": [');
  });
});
