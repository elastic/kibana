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

const ACCEPTED_REQUESTS = [
  { description: 'a plain request', request: 'GET foo/bar' },
  {
    description: 'several bodies in an _msearch request',
    request:
      'GET foo/_msearch \n{}\n{"query": {"match_all": {}}}\n{"index": "bar"}\n{"query": {"match_all": {}}}',
  },
  {
    description: 'several consecutive requests with JSON bodies',
    request:
      'POST test/doc/1 \n{\n "foo": "bar"\n}\nPOST test/doc/2 \n{\n "foo": "baz"\n}\nPOST test/doc/3 \n{\n "foo": "qux"\n}',
  },
  {
    description: 'quotation marks escaped by triple quotes',
    request: 'POST test/_doc/1 \n{\n "foo": """look "escaped" quotes"""\n}',
  },
];

const REJECTED_REQUESTS = [
  { description: 'an invalid method', request: 'FOO foo/bar' },
  { description: 'a missing path', request: 'GET' },
  { description: 'an unterminated body', request: 'POST foo/bar\n {"foo": "bar"' },
];

spaceTest.describe('Console input validation', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
  });

  spaceTest('accepts valid requests', async ({ pageObjects }) => {
    for (const { description, request } of ACCEPTED_REQUESTS) {
      await spaceTest.step(description, async () => {
        await enterRequestClearingSyntaxErrors(pageObjects.console, request);
        await expect(pageObjects.console.invalidSyntaxMarker).toHaveCount(0);
      });
    }
  });

  spaceTest('flags invalid requests', async ({ pageObjects }) => {
    for (const { description, request } of REJECTED_REQUESTS) {
      await spaceTest.step(description, async () => {
        await pageObjects.console.clearEditorText();
        await pageObjects.console.enterText(request);
        await expect(pageObjects.console.invalidSyntaxMarker).not.toHaveCount(0);
      });
    }
  });

  spaceTest('runs a request with an inline comment in the url', async ({ pageObjects }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('GET _search // inline comment');
    await pageObjects.console.sendRequest();

    expect(await pageObjects.console.getResponseStatus()).toBe(200);
  });

  spaceTest('runs a request with an inline comment in the body', async ({ pageObjects }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText(
      'GET _search \n{\n "query": {\n "match_all": {} // inline comment\n}\n}'
    );
    await pageObjects.console.sendRequest();

    expect(await pageObjects.console.getResponseStatus()).toBe(200);
  });

  spaceTest(
    'does not print a deprecation warning for a supported request',
    async ({ pageObjects }) => {
      await pageObjects.console.clearEditorText();
      await pageObjects.console.enterText('GET _search');
      await pageObjects.console.sendRequest();

      expect(await pageObjects.console.responseHasDeprecationWarning()).toBe(false);
    }
  );
});
