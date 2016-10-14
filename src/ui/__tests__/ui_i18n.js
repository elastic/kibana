import expect from 'expect.js';
import { resolve, join } from 'path';
import _ from 'lodash';

import * as kbnTestServer from '../../../test/utils/kbn_server';
import * as UiI18n from '../ui_i18n';
import * as i18n from '../../core_plugins/i18n/server/i18n/i18n';

const FIXTURES = join(__dirname, 'fixtures', 'i18n');

describe('i18n module api wrapper', function () {
  describe('getTranslations', function () {
    context('server with i18n plugin', function () {
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

        const translationPath = join(FIXTURES, 'translations');
        const translationFiles = [
          join(translationPath, 'de.json'),
          join(translationPath, 'en.json'),
          join(translationPath, 'ja.json'),
        ];
        registerTranslations(translationFiles);
      });

      after(async function () {
        await kbnServer.close();
      });

      it('Japenese translations with missing translations in default en locale', async function () {
        const locales = [
          { code: 'es', region: 'ES', quality: 1.0 },
          { code: 'ja', region: undefined, quality: 0.8 }
        ];
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the JA dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!'
        };
        await checkTranslations(locales, defaultLocale, expectedTranslations, kbnServer.server);
      });

      it('Non registered translations using default non registered locale', async function () {
        const locales = [
          { code: 'es', region: 'ES', quality: 1.0 },
          { code: 'fr', region: undefined, quality: 0.8 }
        ];
        const defaultLocale = 'pt';
        await checkTranslations(locales, defaultLocale, null, kbnServer.server);
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

async function checkTranslations(acceptLanguages, defaultLocale, expectedTranslations, server) {
  const actualTranslations = await UiI18n.getTranslations(acceptLanguages, defaultLocale, server);
  expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
}

