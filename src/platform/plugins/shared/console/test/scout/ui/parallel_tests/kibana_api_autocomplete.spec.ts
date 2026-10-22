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
import { spaceTest } from '../fixtures';

const KIBANA_API_REFERENCE_URL = 'https://www.elastic.co/docs/api/doc/kibana/';

spaceTest.describe('Console Kibana API autocomplete', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.clearEditorText();
  });

  spaceTest('suggests Kibana API paths after the kbn: prefix', async ({ pageObjects }) => {
    await pageObjects.console.typeText('GET kbn:/');
    await pageObjects.console.requestAutocompleteSuggestions();
    await expect(pageObjects.console.suggestWidget).toBeVisible();

    const suggestions = await pageObjects.console.getAutocompleteSuggestions();
    expect(suggestions).toContain('api/actions/connectors');
    expect(suggestions).not.toContain('_search');
  });

  spaceTest('does not suggest Kibana paths for Elasticsearch requests', async ({ pageObjects }) => {
    await pageObjects.console.typeText('GET _');
    await pageObjects.console.requestAutocompleteSuggestions();
    await expect(pageObjects.console.suggestWidget).toBeVisible();

    const suggestions = await pageObjects.console.getAutocompleteSuggestions();
    expect(suggestions.some((label) => label.startsWith('api/'))).toBe(false);
  });

  spaceTest(
    'does not suggest Elasticsearch url params for Kibana requests',
    async ({ pageObjects }) => {
      // the prefix keeps `pretty` within the rows the suggest widget renders; the first
      // request is the control, showing it is offered for Elasticsearch requests
      await pageObjects.console.typeText('GET _search?pre');
      await pageObjects.console.requestAutocompleteSuggestions();
      await expect(pageObjects.console.suggestWidget).toBeVisible();
      expect(await pageObjects.console.getAutocompleteSuggestions()).toContain('pretty');

      await pageObjects.console.clearEditorText();
      await pageObjects.console.typeText('GET kbn:/api/features?pre');
      await pageObjects.console.requestAutocompleteSuggestions();
      await pageObjects.console.waitForAutocompleteTriggerWindow();

      expect(await pageObjects.console.getAutocompleteSuggestions()).not.toContain('pretty');
    }
  );

  spaceTest(
    'suggests the ids of the spaces in the cluster for a space path param',
    async ({ pageObjects }) => {
      await pageObjects.console.typeText('GET kbn:/api/spaces/space/');

      // the first suggestions for a Kibana request start loading the cluster specific values
      // in the background, so they show up in the ones requested after that
      await expect(async () => {
        await pageObjects.console.requestAutocompleteSuggestions();
        await pageObjects.console.waitForAutocompleteTriggerWindow();
        expect(await pageObjects.console.getAutocompleteSuggestions()).toContain('default');
      }).toPass({ timeout: 20000 });
    }
  );

  spaceTest('suggests the query params of a Kibana API', async ({ pageObjects }) => {
    await pageObjects.console.typeText('GET kbn:/api/spaces/space?pur');
    await pageObjects.console.requestAutocompleteSuggestions();
    await expect(pageObjects.console.suggestWidget).toBeVisible();

    expect(await pageObjects.console.getAutocompleteSuggestions()).toContain('purpose');
  });

  spaceTest('suggests the values of an enum query param', async ({ pageObjects }) => {
    await pageObjects.console.typeText('GET kbn:/api/spaces/space?purpose=');
    await pageObjects.console.requestAutocompleteSuggestions();
    await expect(pageObjects.console.suggestWidget).toBeVisible();

    expect(await pageObjects.console.getAutocompleteSuggestions()).toStrictEqual(
      expect.arrayContaining(['any', 'copySavedObjectsIntoSpace'])
    );
  });

  spaceTest('suggests the body fields of a Kibana API', async ({ pageObjects }) => {
    await pageObjects.console.typeText('POST kbn:/api/spaces/space\n{\n"');
    await pageObjects.console.requestAutocompleteSuggestions();
    await expect(pageObjects.console.suggestWidget).toBeVisible();

    expect(await pageObjects.console.getAutocompleteSuggestions()).toStrictEqual(
      expect.arrayContaining(['disabledFeatures', 'initials'])
    );
  });

  spaceTest('suggests the values of an enum body field', async ({ pageObjects }) => {
    await pageObjects.console.typeText('POST kbn:/api/spaces/space\n{\n"solution": "');
    await pageObjects.console.requestAutocompleteSuggestions();
    await expect(pageObjects.console.suggestWidget).toBeVisible();

    expect(await pageObjects.console.getAutocompleteSuggestions()).toStrictEqual(
      expect.arrayContaining(['security', 'oblt', 'es', 'classic'])
    );
  });

  [
    {
      request: 'GET kbn:/api/features',
      link: `${KIBANA_API_REFERENCE_URL}operation/operation-get-features`,
    },
    {
      request: 'GET kbn:/api/spaces/space/default',
      link: `${KIBANA_API_REFERENCE_URL}operation/operation-get-spaces-space-id`,
    },
    // no matching operation falls back to the general Kibana API reference
    { request: 'GET kbn:/api/does_not_exist', link: KIBANA_API_REFERENCE_URL },
  ].forEach(({ request, link }) => {
    spaceTest(`opens the API reference for "${request}"`, async ({ page, pageObjects }) => {
      await page.evaluate(() => {
        // record the link instead of opening a tab, so the test doesn't need network access
        const opened: string[] = [];
        Object.assign(window, { opened });
        window.open = (url) => {
          opened.push(String(url));
          return null;
        };
      });
      await pageObjects.console.typeText(request);

      await pageObjects.console.openContextMenu();
      await pageObjects.console.openDocsMenuItem.click();

      await expect
        .poll(() => page.evaluate(() => (window as unknown as { opened: string[] }).opened.at(-1)))
        .toBe(link);
    });
  });
});
