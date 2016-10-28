import expect from 'expect.js';
import { join } from 'path';
import _ from 'lodash';

import * as uii18n from '../ui_i18n';
import * as i18n from '../../core_plugins/i18n/server/i18n';

const FIXTURES = join(__dirname, 'fixtures', 'i18n');

describe('i18n module api wrapper', function () {

  const server = {
    config: {
      get: function () {
        return 'en';
      }
    },
    plugins: {
      i18n: i18n
    }
  };

  before(function () {
    const translationPath = join(FIXTURES, 'translations');
    const translationFiles = [
      join(translationPath, 'de.json'),
      join(translationPath, 'en.json'),
      join(translationPath, 'ja.json'),
    ];
    translationFiles.forEach(i18n.registerTranslations);
  });

  describe('getTranslations', function () {

    it('Japenese translations with missing translations in default en locale', async function () {
      const acceptLanguages = 'es-es;q=1.0,ja;q=0.8';
      const expectedTranslations = {
        'test_plugin_1-NO_SSL': 'Dont run the JA dev server using HTTPS',
        'test_plugin_1-DEV': 'Run the server with development mode defaults',
        'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
        'test_plugin_1-HOME': 'Run along home now!'
      };
      await checkTranslations(acceptLanguages, expectedTranslations, server);
    });

    it('Non registered translations using default registered locale', async function () {
      const acceptLanguages = 'es-ES;q=1.0,fr;q=0.8';
      const expectedTranslations = {
        'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
        'test_plugin_1-DEV': 'Run the server with development mode defaults',
        'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
        'test_plugin_1-HOME': 'Run along home now!'
      };
      await checkTranslations(acceptLanguages, expectedTranslations, server);
    });
  });
});

async function checkTranslations(acceptLanguages, expectedTranslations, server) {
  const actualTranslations = await uii18n.getTranslations(acceptLanguages, server);
  expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
}

