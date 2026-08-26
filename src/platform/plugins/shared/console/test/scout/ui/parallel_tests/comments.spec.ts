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
import { enterRequestClearingSyntaxErrors } from '../lib/syntax_validation';

const DEFAULT_URL = 'GET _search';

const buildRequest = ({ url = DEFAULT_URL, body = '' }: { url?: string; body?: string }) =>
  `${url}\n${body}`;

const SINGLE_LINE_COMMENTS = [
  { description: 'in the request url, using //', url: '// GET _search' },
  { description: 'in the request body, using //', body: '{\n"query": {\n// "match_all": {}\n}\n}' },
  { description: 'in the request url, using #', url: '# GET _search' },
  { description: 'in the request body, using #', body: '{\n"query": {\n# "match_all": {}\n}\n}' },
  { description: 'as a field name, using //', body: '{\n "//": {} }' },
  { description: 'as a field value, using //', body: '{\n "f": "//" }' },
  { description: 'as a field name, using #', body: '{\n "#": {} }' },
  { description: 'as a field value, using #', body: '{\n "f": "#" }' },
];

const MULTILINE_COMMENTS = [
  { description: 'in the request url, using /* */', url: '/* \nGET _search \n*/' },
  {
    description: 'in the request body, using /* */',
    body: '{\n"query": {\n/* "match_all": {} */ \n}\n}',
  },
  { description: 'as a field name, using /*', body: '{\n "/*": {} \n/* "f": 1 */ \n}' },
  { description: 'as a field value, using */', body: '{\n /* "f": 1 */ \n"f": "*/" \n}' },
];

const INVALID_REQUESTS = [
  // E.g. using single quotes
  { description: 'an unterminated single-quoted value', body: `{\n "query": ''` },
  { description: 'an invalid character', body: '{\n $ "query": {}' },
  { description: 'a missing field name', body: '{\n "query": {},\n {}' },
];

spaceTest.describe('Console comments', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
  });

  spaceTest('accepts single line comments', async ({ pageObjects }) => {
    for (const { description, url, body } of SINGLE_LINE_COMMENTS) {
      await spaceTest.step(description, async () => {
        await enterRequestClearingSyntaxErrors(pageObjects.console, buildRequest({ url, body }));
        await expect(pageObjects.console.invalidSyntaxMarker).toHaveCount(0);
      });
    }
  });

  spaceTest('accepts multiline comments', async ({ pageObjects }) => {
    for (const { description, url, body } of MULTILINE_COMMENTS) {
      await spaceTest.step(description, async () => {
        await enterRequestClearingSyntaxErrors(pageObjects.console, buildRequest({ url, body }));
        await expect(pageObjects.console.invalidSyntaxMarker).toHaveCount(0);
      });
    }
  });

  spaceTest('flags invalid request bodies', async ({ pageObjects }) => {
    for (const { description, body } of INVALID_REQUESTS) {
      await spaceTest.step(description, async () => {
        await pageObjects.console.clearEditorText();
        await pageObjects.console.enterText(buildRequest({ body }));
        await expect(pageObjects.console.invalidSyntaxMarker).not.toHaveCount(0);
      });
    }
  });
});
