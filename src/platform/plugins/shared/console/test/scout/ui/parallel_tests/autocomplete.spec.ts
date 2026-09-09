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

const CASE_VARIANTS = [
  'GET',
  'get',
  'GEt',
  'PUT',
  'pUt',
  'POST',
  'Post',
  'DELETE',
  'DeLeTe',
  'head',
];

const COMMENT_CONTEXTS = [
  { description: 'a hash comment', text: '# GET /' },
  { description: 'a double slash comment', text: '// GET /' },
  { description: 'a single line block comment', text: '/* GET /' },
  { description: 'a multiline block comment', text: '/*\n GET /' },
];

spaceTest.describe('Console autocomplete', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.clearEditorText();
  });

  spaceTest('suggests inside a request body', async ({ pageObjects }) => {
    await pageObjects.console.typeText('GET _search\n{\n"query": {\n');

    await expect(pageObjects.console.suggestWidget).toBeVisible();
  });

  spaceTest(
    'inserts a suggestion into inline JSON without breaking the quoting',
    async ({ pageObjects }) => {
      await pageObjects.console.typeText('GET index/_search\n{"query": {te');
      await expect(pageObjects.console.suggestWidget).toBeVisible();

      await pageObjects.console.acceptAutocompleteSuggestion();

      await expect.poll(() => pageObjects.console.getEditorText()).toContain('"term"');
      const editorText = await pageObjects.console.getEditorText();
      expect(editorText).not.toContain('""term"');
      expect(editorText).not.toContain('{term"');
    }
  );

  spaceTest('does not offer the same suggestion twice', async ({ pageObjects }) => {
    await pageObjects.console.typeText(
      'POST _ingest/pipeline/_simulate\n{\n"pipeline": {\n"processors": [\n{\n"script": {\n"'
    );
    await expect(pageObjects.console.suggestWidget).toBeVisible();

    const suggestions = await pageObjects.console.getAutocompleteSuggestions();

    expect(suggestions).toStrictEqual([...new Set(suggestions)]);
  });

  spaceTest('suggests the HTTP methods matching what has been typed', async ({ pageObjects }) => {
    // Sorted by `autocompleteMethods` declaration order, not alphabetically. See #270787.
    const methodsByPrefix = {
      G: ['GET'],
      P: ['POST', 'PUT', 'PATCH'],
      D: ['DELETE'],
      H: ['HEAD'],
    };

    for (const [prefix, methods] of Object.entries(methodsByPrefix)) {
      await spaceTest.step(prefix, async () => {
        await pageObjects.console.clearEditorText();
        await pageObjects.console.typeText(prefix);

        await expect(pageObjects.console.suggestWidget).toBeVisible();
        await expect
          .poll(() => pageObjects.console.getAutocompleteSuggestions())
          .toStrictEqual(methods);
      });
    }
  });

  spaceTest('suggests the API endpoints of the typed method', async ({ pageObjects }) => {
    const endpointsByRequest = {
      'GET _': ['_alias', '_all'],
      'PUT _': ['_all'],
      'POST _': ['_aliases', '_all'],
      'DELETE _': ['_all'],
      'HEAD _': ['_alias', '_all'],
    };

    for (const [request, endpoints] of Object.entries(endpointsByRequest)) {
      await spaceTest.step(request, async () => {
        await pageObjects.console.clearEditorText();
        await pageObjects.console.typeText(request);

        await expect(pageObjects.console.suggestWidget).toBeVisible();
        // Only the leading suggestions, but in order: that's what pressing Enter picks.
        await expect
          .poll(async () =>
            (await pageObjects.console.getAutocompleteSuggestions()).slice(0, endpoints.length)
          )
          .toStrictEqual(endpoints);
      });
    }
  });

  spaceTest('expands a suggestion that carries placeholder fields', async ({ pageObjects }) => {
    await pageObjects.console.typeText('GET _search\n{\n"ag');
    await expect(pageObjects.console.suggestWidget).toBeVisible();

    await pageObjects.console.acceptAutocompleteSuggestion();

    await expect
      .poll(async () => (await pageObjects.console.getEditorText()).replace(/\s/g, ''))
      .toContain('"aggs":{"NAME":{"AGG_TYPE":{}}}');
  });

  spaceTest('activates on a single character after a slash in the url', async ({ pageObjects }) => {
    await pageObjects.console.typeText('GET .kibana/_');

    await expect(pageObjects.console.suggestWidget).toBeVisible();
  });

  spaceTest(
    'activates after a comma listing several indices in the url',
    async ({ pageObjects }) => {
      await pageObjects.console.typeText('GET _cat/indices/.kibana,');
      await pageObjects.console.requestAutocompleteSuggestions();

      await expect(pageObjects.console.suggestWidget).toBeVisible();
    }
  );

  spaceTest('activates for methods however they are capitalized', async ({ pageObjects }) => {
    for (const method of CASE_VARIANTS) {
      await spaceTest.step(method, async () => {
        await pageObjects.console.clearEditorText();
        await pageObjects.console.typeText(`${method} _`);

        await expect(pageObjects.console.suggestWidget).toBeVisible();
      });
    }
  });

  spaceTest('suggests ES|QL commands inside a triple quoted query', async ({ pageObjects }) => {
    await pageObjects.console.typeText('POST _query\n{\n"query": """');

    await expect(pageObjects.console.suggestWidget).toBeVisible();
    await expect
      .poll(() => pageObjects.console.getAutocompleteSuggestions())
      .toStrictEqual(expect.arrayContaining(['FROM', 'ROW', 'SHOW']));
  });

  spaceTest(
    'does not suggest ES|QL inside triple quotes that are not a query',
    async ({ pageObjects }) => {
      await pageObjects.console.typeText('POST _query\n{\n"script": """\n');

      await pageObjects.console.waitForAutocompleteTriggerWindow();
      await expect(pageObjects.console.suggestWidget).toBeHidden();
    }
  );

  spaceTest('does not suggest ES|QL outside of a query', async ({ pageObjects }) => {
    await pageObjects.console.typeText('GET _search\n{\n"query": {\n');
    await expect(pageObjects.console.suggestWidget).toBeVisible();

    const suggestions = await pageObjects.console.getAutocompleteSuggestions();

    expect(suggestions).not.toContain('FROM');
    expect(suggestions).not.toContain('ROW');
    expect(suggestions).not.toContain('SHOW');
  });

  spaceTest('does not activate inside a comment', async ({ pageObjects }) => {
    for (const { description, text } of COMMENT_CONTEXTS) {
      await spaceTest.step(description, async () => {
        await pageObjects.console.clearEditorText();
        await pageObjects.console.typeText(text);

        await pageObjects.console.waitForAutocompleteTriggerWindow();
        await expect(pageObjects.console.suggestWidget).toBeHidden();
      });
    }
  });
});
