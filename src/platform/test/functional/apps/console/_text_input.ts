/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

const RESTORE_AND_EXECUTE = true;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const toasts = getService('toasts');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);

  // Console consumes `load_from` once and then removes it from the URL. `navigateToApp` expects
  // the final URL to still start with the requested one and reloads the page when it does not,
  // and every reload appended the request again. Load the URL exactly once instead.
  const loadFromDataUri = async (dataUri: string) => {
    const { origin, pathname } = new URL(await browser.getCurrentUrl());
    // `browser.get` adds a `_t` timestamp, which forces a full page load even when only the hash changes.
    await browser.get(`${origin}${pathname}#/console/shell?load_from=${dataUri}`);
  };

  describe('text input', function testTextInput() {
    before(async () => {
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.skipTourIfExists();
    });

    beforeEach(async () => {
      await PageObjects.console.openConsole();
      await PageObjects.console.clearEditorText();
    });

    describe('with a data URI in the load_from query', () => {
      it('loads the data from the URI', async () => {
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText(`GET _search`);
        await PageObjects.console.sleepForDebouncePeriod(1000);

        await loadFromDataUri('data:text/plain,BYUwNmD2Q'); // "hello" compressed

        await retry.try(async () => {
          const actualRequest = await PageObjects.console.getEditorText();
          // The data should be appended after the existing text
          expect(actualRequest.trim()).to.eql('GET _search\nhello');
        });
      });

      describe('with invalid data', () => {
        it('shows a toast error', async () => {
          await loadFromDataUri('data:text/plain,BYUwNmD2');

          await retry.try(async () => {
            expect(await toasts.getCount()).to.equal(1);
          });
        });
      });
    });

    describe('console history', () => {
      const sendRequest = async (request: string) => {
        await PageObjects.console.enterText(request);
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();
      };

      it('should show the history', async () => {
        await sendRequest('GET /_search?pretty');
        await PageObjects.console.openHistory();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          const history = await PageObjects.console.getHistoryEntries();
          expect(history).to.eql(['GET /_search?pretty\na few seconds ago']);
        });

        await PageObjects.console.clickClearHistory();
      });

      it('should load a request from history', async () => {
        await sendRequest('GET _search\n{"query": {"match_all": {}}}');
        await PageObjects.console.clearEditorText();

        await PageObjects.console.openHistory();
        await PageObjects.console.loadRequestFromHistory(0);

        await retry.try(async () => {
          const actualRequest = await PageObjects.console.getEditorText();
          expect(actualRequest.trim()).to.contain(
            'GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}'
          );
        });
      });

      it('can restore and execute a request from history', async () => {
        await sendRequest('GET _search\n{"query": {"match_all": {}}}');
        await PageObjects.console.clearEditorText();

        await PageObjects.console.openHistory();
        await PageObjects.console.loadRequestFromHistory(0, RESTORE_AND_EXECUTE);

        await retry.try(async () => {
          const output = await PageObjects.console.getOutputText();
          expect(output).to.contain('successful');
        });
      });
    });
  });
}
