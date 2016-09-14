import expect from 'expect.js';
import { resolve } from 'path';

import UiExports from '../ui_exports';
import * as kbnTestServer from '../../../test/utils/kbn_server';
import UiI18n from '../ui_i18n';
import i18n from '../../core_plugins/i18n/server/i18n/i18n';
import langParser from 'accept-language-parser';

const DATA_PATH = __dirname + '/fixtures/i18n';

describe('UiI18n Tests', function () {
  describe('Test APIs', function () {
    context('Server Initialized', function () {
      this.slow(10000);
      this.timeout(60000);
      const defaultLocale = 'en';
      let kbnServer;

      before(async function () {
        kbnServer = kbnTestServer.createServer({
          plugins: {
            paths: [
              resolve(__dirname, 'fixtures/i18n')
            ]
          },

          i18n: {
            locale: 'en'
          }
        });

        await kbnServer.ready();

        const translationPath = DATA_PATH + '/translations';
        const translationFiles = [
          translationPath + '/de.json',
          translationPath + '/en.json',
          translationPath + '/ja.json'
        ];

        registerTranslations(translationFiles);

      });

      after(async function () {
        await kbnServer.close();
      });

      it('Default locale', function (done) {
        const acceptLanguageStr = 'fr,es';
        const acceptLanguages = langParser.parse(acceptLanguageStr);
        const locale = UiI18n.getTranslationLocale(acceptLanguages, defaultLocale, kbnServer.server);
        expect(locale).to.eql('en');
        done();
      });
      it('Locale expected', function (done) {
        const acceptLanguageStr = 'fr,de;q=0.5';
        const acceptLanguages = langParser.parse(acceptLanguageStr);
        const locale = UiI18n.getTranslationLocale(acceptLanguages, defaultLocale, kbnServer.server);
        expect(locale).to.eql('de');
        done();
      });
      it('English translations', async function () {
        const locale = 'en';
        const expectedTranslationJsonFile = DATA_PATH + '/reference/en.json';
        const expectedTranslations = require(expectedTranslationJsonFile);
        const result = await checkTranslations(locale, expectedTranslations, kbnServer.server);
        expect(result).to.be(true);
      });
      it('German translations', async function () {
        const locale = 'de';
        const expectedTranslationJsonFile = DATA_PATH + '/reference/de.json';
        const expectedTranslations = require(expectedTranslationJsonFile);
        const result = await checkTranslations(locale, expectedTranslations, kbnServer.server);
        expect(result).to.be(true);
      });
      it('Japenese translations filling missing translations', async function () {
        const defaultLocale = 'en';
        const locale = 'ja';
        const expectedTranslationJsonFile = DATA_PATH + '/reference/ja.json';
        const expectedTranslations = require(expectedTranslationJsonFile);
        const result = await checkMissingTranslations(locale, defaultLocale, expectedTranslations, kbnServer.server);
        expect(result).to.be(true);
      });
    });
  });
});

function registerTranslations(pluginTranslationFiles) {
  const numFiles = pluginTranslationFiles.length;
  for (let indx = 0; indx < numFiles; indx++) {
    i18n.registerTranslations(pluginTranslationFiles[indx]);
  }
}

function compareTranslations(actual, expected) {
  let equal = true;

  for (let key in expected) {
    if (!actual.hasOwnProperty(key)) {
      equal = false;
      break;
    }
    if (actual[key] !== expected[key]) {
      equal = false;
      break;
    }
  }

  return equal;
}

async function checkTranslations(locale, expectedTranslations, server) {
  const actualTranslations = await UiI18n.getLocaleTranslations(locale, server);
  return compareTranslations(actualTranslations, expectedTranslations);
}

async function checkMissingTranslations(locale, defaultLocale, expectedTranslations, server) {
  let actualTranslations = await UiI18n.getLocaleTranslations(locale, server);
  actualTranslations = await UiI18n.updateMissingTranslations(defaultLocale, actualTranslations, server);
  return compareTranslations(actualTranslations, expectedTranslations);
}
