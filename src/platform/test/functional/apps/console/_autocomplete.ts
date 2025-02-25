/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const find = getService('find');

  async function runTemplateTest(type: string, template: string) {
    await PageObjects.console.enterText(`{\n\t"type": "${type}",\n`);
    await PageObjects.console.sleepForDebouncePeriod(500);
    // Prompt autocomplete for 'settings'
    await PageObjects.console.promptAutocomplete('s');

    await retry.waitFor('autocomplete to be visible', () =>
      PageObjects.console.isAutocompleteVisible()
    );
    await PageObjects.console.pressEnter();
    await retry.try(async () => {
      const request = await PageObjects.console.getEditorText();
      log.debug(request);
      expect(request).to.contain(`${template}`);
    });
  }

  describe('console autocomplete feature', function describeIndexTests() {
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      // Ensure that the text area can be interacted with
      await PageObjects.console.skipTourIfExists();
      await PageObjects.console.clearEditorText();
      log.debug('setAutocompleteTrace true');
      await PageObjects.console.setAutocompleteTrace(true);
    });

    after(async () => {
      log.debug('setAutocompleteTrace false');
      await PageObjects.console.setAutocompleteTrace(false);
    });

    it('should provide basic auto-complete functionality', async () => {
      await PageObjects.console.enterText(`GET _search\n`);
      await PageObjects.console.enterText(`{\n\t"query": {`);
      await PageObjects.console.pressEnter();
      await PageObjects.console.sleepForDebouncePeriod();
      await PageObjects.console.promptAutocomplete();
      expect(PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
    });

    it('correctly autocompletes inline JSON', async () => {
      // 1) Type the request line + inline body (two lines total).
      await PageObjects.console.enterText('GET index/_search\n{"query": {t');

      // 2) Trigger autocomplete
      await PageObjects.console.sleepForDebouncePeriod();
      await PageObjects.console.promptAutocomplete('e');

      // 3) Wait for the autocomplete suggestions to appear
      await retry.waitFor('autocomplete to be visible', () =>
        PageObjects.console.isAutocompleteVisible()
      );

      // 4) Press Enter to accept the first suggestion (likely "term")
      await PageObjects.console.pressEnter();

      // 5) Now check the text in the editor
      await retry.try(async () => {
        const text = await PageObjects.console.getEditorText();
        // Assert we do NOT invalid autocompletions such as `""term"` or `{term"`
        expect(text).not.to.contain('""term"');
        expect(text).not.to.contain('{term"');
        // and that "term" was inserted
        expect(text).to.contain('"term"');
      });
    });

    it('should not show duplicate suggestions', async () => {
      await PageObjects.console.enterText(`POST _ingest/pipeline/_simulate
{
  "pipeline": {
    "processors": [
      {
        "script": {`);
      await PageObjects.console.pressEnter();
      await PageObjects.console.sleepForDebouncePeriod();
      await PageObjects.console.enterText(`"`);
      expect(PageObjects.console.isAutocompleteVisible()).to.be.eql(true);

      // Iterate on the first 10 suggestions (the ones that are only visible without scrolling)
      const suggestions = [];
      for (let i = 0; i < 10; i++) {
        suggestions.push(await PageObjects.console.getAutocompleteSuggestion(i));
      }

      // and expect the array to not have duplicates
      expect(suggestions).to.eql(_.uniq(suggestions));
    });

    describe('Autocomplete behavior', () => {
      beforeEach(async () => {
        await PageObjects.console.clearEditorText();
      });

      it('HTTP methods', async () => {
        const suggestions = {
          G: ['GET'],
          P: ['PATCH', 'POST', 'PUT'],
          D: ['DELETE'],
          H: ['HEAD'],
        };
        for (const [char, methods] of Object.entries(suggestions)) {
          await PageObjects.console.sleepForDebouncePeriod();
          log.debug('Key type "%s"', char);
          await PageObjects.console.enterText(char);

          await retry.waitFor('autocomplete to be visible', () =>
            PageObjects.console.isAutocompleteVisible()
          );
          expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);

          for (const [i, method] of methods.entries()) {
            expect(await PageObjects.console.getAutocompleteSuggestion(i)).to.contain(method);
          }

          await PageObjects.console.pressEscape();
          await PageObjects.console.clickClearInput();
        }
      });

      it('ES API endpoints', async () => {
        const suggestions = {
          'GET _': ['_alias', '_all'],
          'PUT _': ['_all'],
          'POST _': ['_aliases', '_all'],
          'DELETE _': ['_all'],
          'HEAD _': ['_alias', '_all'],
        };
        for (const [text, endpoints] of Object.entries(suggestions)) {
          for (const char of text) {
            await PageObjects.console.sleepForDebouncePeriod();
            log.debug('Key type "%s"', char);
            await PageObjects.console.enterText(char);
          }

          await retry.waitFor('autocomplete to be visible', () =>
            PageObjects.console.isAutocompleteVisible()
          );
          expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);

          for (const [i, endpoint] of endpoints.entries()) {
            expect(await PageObjects.console.getAutocompleteSuggestion(i)).to.be.eql(endpoint);
          }

          await PageObjects.console.pressEscape();
          await PageObjects.console.pressEnter();
        }
      });

      it('JSON autocompletion with placeholder fields', async () => {
        await PageObjects.console.enterText('GET _search\n');
        await PageObjects.console.enterText('{');
        await PageObjects.console.sleepForDebouncePeriod();
        await PageObjects.console.pressEnter();

        for (const char of '"ag') {
          await PageObjects.console.sleepForDebouncePeriod();
          log.debug('Key type "%s"', char);
          await PageObjects.console.enterText(char);
        }
        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
        await PageObjects.console.pressEnter();
        await PageObjects.console.sleepForDebouncePeriod();

        // Verify that the autocomplete suggestion is inserted into the editor
        expect((await PageObjects.console.getEditorText()).replace(/\s/g, '')).to.contain(
          `
"aggs": {
  "NAME": {
    "AGG_TYPE": {}
  }
}
`.replace(/\s/g, '')
        );
      });

      it('Dynamic autocomplete', async () => {
        await PageObjects.console.enterText('POST test/_doc\n{}');
        await PageObjects.console.clickPlay();

        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.getResponseStatus()).to.be('201');

        await PageObjects.console.pressEnter();
        for (const char of 'POST t') {
          await PageObjects.console.sleepForDebouncePeriod();
          log.debug('Key type "%s"', char);
          await PageObjects.console.enterText(char);
        }
        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);

        expect(await PageObjects.console.getAutocompleteSuggestion(0)).to.be.eql('test');
      });
    });

    describe('anti-regression watchdogs', () => {
      beforeEach(async () => {
        await PageObjects.console.clearEditorText();
      });

      // flaky
      it.skip('should suppress auto-complete on arrow keys', async () => {
        await PageObjects.console.enterText(`\nGET _search\nGET _search`);
        await PageObjects.console.pressEnter();
        const keyPresses = [
          'pressUp',
          'pressUp',
          'pressDown',
          'pressDown',
          'pressRight',
          'pressRight',
          'pressLeft',
          'pressLeft',
        ] as const;
        for (const keyPress of keyPresses) {
          await PageObjects.console.sleepForDebouncePeriod();
          log.debug('Key', keyPress);
          await PageObjects.console[keyPress]();
          expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(false);
        }
      });

      it('should activate auto-complete for methods case-insensitively', async () => {
        const methods = _.sampleSize(
          _.compact(
            `
            GET GEt GeT Get gET gEt geT get
            PUT PUt PuT Put pUT pUt puT put
            POST POSt POsT POst PoST PoSt PosT Post pOST pOSt pOsT pOst poST poSt posT post
            DELETE DELETe DELEtE DELEte DELeTE DELeTe DELetE DELete DElETE DElETe DElEtE DElEte DEleTE DEleTe DEletE DElete
            DeLETE DeLETe DeLEtE DeLEte DeLeTE DeLeTe DeLetE DeLete DelETE DelETe DelEtE DelEte DeleTE DeleTe DeletE Delete
            dELETE dELETe dELEtE dELEte dELeTE dELeTe dELetE dELete dElETE dElETe dElEtE dElEte dEleTE dEleTe dEletE dElete
            deLETE deLETe deLEtE deLEte deLeTE deLeTe deLetE deLete delETE delETe delEtE delEte deleTE deleTe deletE delete
            HEAD HEAd HEaD HEad HeAD HeAd HeaD Head hEAD hEAd hEaD hEad heAD heAd heaD head
            `.split(/\s+/m)
          ),
          20 // 20 of 112 (approx. one-fifth) should be enough for testing
        );

        for (const method of methods) {
          await PageObjects.console.clearEditorText();

          for (const char of method.slice(0, -1)) {
            await PageObjects.console.sleepForDebouncePeriod();
            log.debug('Key type "%s"', char);
            await PageObjects.console.enterText(char); // e.g. 'P' -> 'Po' -> 'Pos'
            await retry.waitFor('autocomplete to be visible', () =>
              PageObjects.console.isAutocompleteVisible()
            );
            expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
          }

          for (const char of [method.at(-1), ' ', '_']) {
            await PageObjects.console.sleepForDebouncePeriod();
            log.debug('Key type "%s"', char);
            await PageObjects.console.enterText(char!); // e.g. 'Post ' -> 'Post _'
          }

          await retry.waitFor('autocomplete to be visible', () =>
            PageObjects.console.isAutocompleteVisible()
          );
          expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
        }
      });

      it('should activate auto-complete for a single character immediately following a slash in URL', async () => {
        await PageObjects.console.enterText('GET .kibana');

        for (const char of ['/', '_']) {
          await PageObjects.console.sleepForDebouncePeriod();
          log.debug('Key type "%s"', char);
          await PageObjects.console.enterText(char); // i.e. 'GET .kibana/' -> 'GET .kibana/_'
        }

        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
      });

      it('should activate auto-complete for multiple indices after comma in URL', async () => {
        await PageObjects.console.enterText('GET _cat/indices/.kibana');

        await PageObjects.console.sleepForDebouncePeriod();
        log.debug('Key type ","');
        await PageObjects.console.enterText(','); // i.e. 'GET /_cat/indices/.kibana,'

        await PageObjects.console.sleepForDebouncePeriod();
        log.debug('Key type Ctrl+SPACE');
        await PageObjects.console.pressCtrlSpace();

        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
      });
    });

    // not implemented for monaco yet https://github.com/elastic/kibana/issues/184856
    describe.skip('with a missing comma in query', () => {
      const LINE_NUMBER = 4;
      beforeEach(async () => {
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText('\nGET _search');
        await PageObjects.console.pressEnter();
      });

      it('should add a comma after previous non empty line', async () => {
        await PageObjects.console.enterText(`{\n\t"query": {\n\t\t"match": {}`);
        await PageObjects.console.pressEnter();
        await PageObjects.console.pressEnter();
        await PageObjects.console.pressEnter();
        await PageObjects.console.sleepForDebouncePeriod();
        await PageObjects.console.promptAutocomplete();
        await PageObjects.console.pressEnter();
        await retry.try(async () => {
          let conApp = await find.byCssSelector('.conApp');
          const firstInnerHtml = await conApp.getAttribute('innerHTML');
          await PageObjects.common.sleep(500);
          conApp = await find.byCssSelector('.conApp');
          const secondInnerHtml = await conApp.getAttribute('innerHTML');
          return firstInnerHtml === secondInnerHtml;
        });
        const textAreaString = await PageObjects.console.getEditorText();
        log.debug('Text Area String Value==================\n');
        log.debug(textAreaString);
        expect(textAreaString).to.contain(',');
        const text = await PageObjects.console.getEditorTextAtLine(LINE_NUMBER);
        const lastChar = text.charAt(text.length - 1);
        expect(lastChar).to.be.eql(',');
      });

      it('should add a comma after the triple quoted strings', async () => {
        await PageObjects.console.enterText(`{\n\t"query": {\n\t\t"term": """some data"""`);
        await PageObjects.console.pressEnter();
        await PageObjects.console.sleepForDebouncePeriod();
        await PageObjects.console.promptAutocomplete();
        await PageObjects.console.pressEnter();

        await retry.waitForWithTimeout('text area to contain comma', 25000, async () => {
          const textAreaString = await PageObjects.console.getEditorText();
          return textAreaString.includes(',');
        });

        const text = await PageObjects.console.getEditorTextAtLine(LINE_NUMBER);
        const lastChar = text.charAt(text.length - 1);
        expect(lastChar).to.be.eql(',');
      });
    });

    describe('with conditional templates', () => {
      beforeEach(async () => {
        await PageObjects.console.clickClearInput();
        await PageObjects.console.enterText('POST _snapshot/test_repo\n');
      });

      it('should insert fs template', async () => {
        await runTemplateTest('fs', `"location": "path"`);
      });

      it('should insert url template', async () => {
        await runTemplateTest('url', `"url": ""`);
      });

      it('should insert s3 template', async () => {
        await runTemplateTest('s3', `"bucket": ""`);
      });

      it('should insert azure template', async () => {
        await runTemplateTest('azure', `"path": ""`);
      });
    });

    describe('index fields autocomplete', () => {
      const indexName = `index_field_test-${Date.now()}-${Math.random()}`;

      before(async () => {
        await PageObjects.console.clearEditorText();
        // create an index with only 1 field
        await PageObjects.console.enterText(`PUT ${indexName}/_doc/1\n{\n"test":1\n}`);
        await PageObjects.console.clickPlay();
      });

      after(async () => {
        await PageObjects.console.clearEditorText();
        // delete the test index
        await PageObjects.console.enterText(`DELETE ${indexName}`);
        await PageObjects.console.clickPlay();
      });

      it('fields autocomplete only shows fields of the index', async () => {
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText('GET _search\n{\n"fields": [');
        // Wait for the autocomplete request to finish loading
        await PageObjects.header.waitUntilLoadingHasFinished();
        // Trigger the autocomplete for the field we previously added
        await PageObjects.console.enterText('te');

        expect(await PageObjects.console.getAutocompleteSuggestion(0)).to.be.eql('test');
        expect(await PageObjects.console.getAutocompleteSuggestion(1)).to.be.eql(undefined);
      });
    });

    describe('Autocomplete shouldnt trigger within', () => {
      beforeEach(async () => {
        await PageObjects.console.skipTourIfExists();
        await PageObjects.console.clearEditorText();
      });

      it('a hash comment', async () => {
        await PageObjects.console.enterText(`# GET /`);
        await PageObjects.console.sleepForDebouncePeriod();

        expect(PageObjects.console.isAutocompleteVisible()).to.be.eql(false);
      });

      it('a simple double slash comment', async () => {
        await PageObjects.console.enterText(`// GET /`);
        await PageObjects.console.sleepForDebouncePeriod();

        expect(PageObjects.console.isAutocompleteVisible()).to.be.eql(false);
      });

      it('a single line block comment', async () => {
        await PageObjects.console.enterText(`/* GET /`);
        await PageObjects.console.sleepForDebouncePeriod();

        expect(PageObjects.console.isAutocompleteVisible()).to.be.eql(false);
      });

      it('a multiline block comment', async () => {
        await PageObjects.console.enterText(`/*
          GET /`);
        await PageObjects.console.sleepForDebouncePeriod();

        expect(PageObjects.console.isAutocompleteVisible()).to.be.eql(false);
      });
    });
  });
}
