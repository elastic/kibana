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

// Unique per run so parallel workers can't collide on the index name.
const INDEX_NAME = `console-autocomplete-fixture-${Math.random().toString(36).slice(2)}`;
const FIELD_NAME = 'autocompleted_field';

test.describe(
  'Console autocomplete of indices and fields',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeAll(async ({ esClient }) => {
      await esClient.index({
        index: INDEX_NAME,
        document: { [FIELD_NAME]: 1 },
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

    test('suggests an index that exists in the cluster', async ({ pageObjects }) => {
      await pageObjects.console.typeText(`POST ${INDEX_NAME.slice(0, 12)}`);

      await expect(pageObjects.console.suggestWidget).toBeVisible();
      await expect
        .poll(() => pageObjects.console.getAutocompleteSuggestions())
        .toContain(INDEX_NAME);
    });

    test('suggests only the fields of the index being queried', async ({ pageObjects }) => {
      await pageObjects.console.typeText(
        `GET ${INDEX_NAME}/_search\n{\n"fields": [\n"${FIELD_NAME.slice(0, 6)}`
      );

      await expect(pageObjects.console.suggestWidget).toBeVisible();
      await expect
        .poll(() => pageObjects.console.getAutocompleteSuggestions())
        .toStrictEqual([FIELD_NAME]);
    });
  }
);
