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
import { registerTimelionSuiteHooks, test } from '../fixtures';

test.describe(
  'Timelion visualization - expression typeahead',
  { tag: tags.stateful.classic },
  () => {
    registerTimelionSuiteHooks(test);

    test('should display function suggestions', async ({ pageObjects }) => {
      const { timelion } = pageObjects;
      await timelion.setExpression('');
      await timelion.typeInCodeEditor('.e');

      // Wait for Monaco editor model to update
      await expect
        .poll(async () => await timelion.getCodeEditorValue(0), { timeout: 5000 })
        .toBe('.e');

      const suggestions = await timelion.getSuggestionItems();
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toContain('elasticsearch');
      expect(suggestions[1]).toContain('es');

      await timelion.clickSuggestion(1);

      // Wait for Monaco editor model to update after suggestion selection
      await expect
        .poll(async () => await timelion.getCodeEditorValue(0), { timeout: 5000 })
        .toBe('.es()');
    });

    // Skipped: https://github.com/elastic/kibana/issues/244933
    test.skip('should show index pattern suggestions for index argument', async ({
      pageObjects,
    }) => {
      const { timelion } = pageObjects;
      await timelion.setExpression('');
      await timelion.typeInCodeEditor('.es(index=');

      await expect
        .poll(
          async () => {
            const items = await timelion.getSuggestionItems();
            return items.length > 0 && items[0].includes('log');
          },
          { timeout: 10000 }
        )
        .toBe(true);
    });

    test.skip('should show field suggestions for timefield argument when index pattern set', async ({
      pageObjects,
    }) => {
      const { timelion } = pageObjects;
      await timelion.setExpression('');
      await timelion.typeInCodeEditor('.es(index=logstash-*, timefield=');

      await expect
        .poll(
          async () => {
            const items = await timelion.getSuggestionItems();
            return items.length === 4 && items[0].includes('@timestamp');
          },
          { timeout: 10000 }
        )
        .toBe(true);
    });

    test.skip('should show field suggestions for split argument when index pattern set', async ({
      pageObjects,
    }) => {
      const { timelion } = pageObjects;
      await timelion.setExpression('');
      await timelion.typeInCodeEditor('.es(index=logstash-*, timefield=@timestamp, split=');

      await expect
        .poll(
          async () => {
            const items = await timelion.getSuggestionItems();
            return items.length > 0 && items[0].includes('@message.raw');
          },
          { timeout: 10000 }
        )
        .toBe(true);
    });

    test.skip('should show field suggestions for metric argument when index pattern set', async ({
      pageObjects,
    }) => {
      const { timelion } = pageObjects;
      await timelion.typeInCodeEditor('.es(index=logstash-*, timefield=@timestamp, metric=avg:');

      await expect
        .poll(
          async () => {
            const items = await timelion.getSuggestionItems();
            return items.length > 0 && items[0].includes('avg:bytes');
          },
          { timeout: 10000 }
        )
        .toBe(true);
    });
  }
);
