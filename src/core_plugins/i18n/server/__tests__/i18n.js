import expect from 'expect.js';
import path from 'path';
import _ from 'lodash';
import { join } from 'path';

import * as i18n from '../i18n/i18n';

const FIXTURES = path.join(__dirname, 'fixtures');

describe('i18n module', function () {

  describe('one plugin', function () {

    before('registerTranslations - one plugin', function () {
      const pluginName = 'test_plugin_1';
      const pluginTranslationPath = path.join(FIXTURES, 'translations', pluginName);
      const translationFiles = [
        path.join(pluginTranslationPath, 'de.json'),
        path.join(pluginTranslationPath, 'en.json')
      ];
      translationFiles.forEach(i18n.registerTranslations);
    });

    after('unregisterTranslations - one plugin', function () {
      i18n.unregisterTranslations();
    });

    describe('getTranslationsForLocale', function () {

      it('en translations are registered' , function () {
        const locale = 'en';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!'
        };
        checkTranslations(locale, expectedTranslationJson);
        return;
      });

      it('de translations are registered' , function () {
        const locale = 'de';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
        };
        checkTranslations(locale, expectedTranslationJson);
        return;
      });

      it('es translations not registered' , function () {
        const locale = 'es';
        checkTranslations(locale, {});
        return;
      });

    });

    describe('getRegisteredTranslationLocales', function () {

      it('Translation locales are registered', function () {
        const expectedLocales = ['en', 'de'];
        checkRegisteredLocales(expectedLocales);
        return;
      });

    });

    describe('getTranslationsForLocales', function () {

      it('no translations as no locale registered which matches, then get translations for default locale' , function () {
        const locales = [
          { code: 'es', region: 'ES', quality: 1.0 },
          { code: 'fr', region: undefined, quality: 0.8 }
        ];
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!'
        };
        const server = {
          config: {
            get: function () {
              return 'en';
            }
          }
        };
        checkTranslationsForLocales(getLanguageTags(locales), {});
        checkTranslationsForDefaultLocale(server, expectedTranslations);
        return;
      });

      it('de translations should be chosen' , function () {
        const locales = [
          { code: 'es', region: 'ES', quality: 1.0 },
          { code: 'de', region: undefined, quality: 0.8 }
        ];
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults',
        };
        checkTranslationsForLocales(getLanguageTags(locales), expectedTranslationJson);
        return;
      });

      it('No translations regsitered for locales, so empty translations returned' , function () {
        const locales = [
          { code: 'es', region: 'ES', quality: 1.0 },
          { code: 'fr', region: undefined, quality: 0.8 }
        ];
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!'
        };
        checkTranslationsForLocales(getLanguageTags(locales), {});
        return;
      });

    });

  });

  describe('multiple plugins', function () {

    before('registerTranslations - multiple plugin', function () {
      let pluginName = 'test_plugin_1';
      let pluginTranslationPath = path.join(FIXTURES, 'translations', pluginName);
      let translationFiles = [
        path.join(pluginTranslationPath, 'de.json'),
        path.join(pluginTranslationPath, 'en.json')
      ];
      pluginName = 'test_plugin_2';
      pluginTranslationPath = path.join(FIXTURES, 'translations', pluginName);
      translationFiles.push(path.join(pluginTranslationPath, 'en.json'));
      translationFiles.forEach(i18n.registerTranslations);
    });

    after('unregisterTranslations - multiple plugin', function () {
      i18n.unregisterTranslations();
    });

    describe('getTranslationsForLocale', function () {

      it('en translations are registered' , function () {
        const locale = 'en';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!',
          'test_plugin_2-XXXXXX': 'This is XXXXXX string',
          'test_plugin_2-YYYY_PPPP': 'This is YYYY_PPPP string',
          'test_plugin_2-FFFFFFFFFFFF': 'This is FFFFFFFFFFFF string',
          'test_plugin_2-ZZZ': 'This is ZZZ string'
        };
        checkTranslations(locale, expectedTranslationJson);
        return;
      });

      it('de translations are registered' , function () {
        const locale = 'de';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
        };
        checkTranslations(locale, expectedTranslationJson);
        return;
      });

      it('Translations are registered with non unique key' , function () {
        const pluginName = 'test_plugin_2';
        const pluginTranslationPath = path.join(FIXTURES, 'translations', pluginName);
        const translationFiles = [ path.join(pluginTranslationPath, 'de.json') ];
        translationFiles.forEach(i18n.registerTranslations);
        const locale = 'de';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS! I am regsitered afterwards!',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
        };
        checkTranslations(locale, expectedTranslationJson);
        return;
      });

    });

    describe('getRegisteredTranslationLocales', function () {

      it('Translation locales are registered', function () {
        const expectedLocales = ['en', 'de'];
        checkRegisteredLocales(expectedLocales);
        return;
      });

    });

  });

  describe('registerTranslations', function () {

    it('Empty filename', function () {
      try {
        i18n.registerTranslations('');
      } catch (err) {
        expect(err).to.eql(new Error());
      }
      return;
    });

    it('Filename no extension', function () {
      try {
        i18n.registerTranslations('file1');
      } catch (err) {
        expect(err).to.eql(new Error());
      }
      return;
    });

    it('Filename non JSON extension', function () {
      try {
        i18n.registerTranslations('file1.txt');
      } catch (err) {
        expect(err).to.eql(new Error());
      }
      return;
    });

  });

});

function checkTranslations(locale, expectedTranslations) {
  return i18n.getTranslationsForLocale(locale).then(function (actualTranslations) {
    expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
  });
}

function checkTranslationsForDefaultLocale(server, expectedTranslations) {
  return i18n.getTranslationsForDefaultLocale(server).then(function (actualTranslations) {
    expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
  });
}

function checkTranslationsForLocales(languageTags, expectedTranslations) {
  return i18n.getTranslationsForLocales(languageTags).then(function (actualTranslations) {
    expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
  });
}

function checkRegisteredLocales(expectedLocales) {
  const actualLocales = i18n.getRegisteredTranslationLocales();
  actualLocales.sort();
  expectedLocales.sort();
  expect(_.isEqual(actualLocales, expectedLocales)).to.be(true);
}

function getLanguageTags(languages) {
  const languageTags = [];

  if (_.isEmpty(languages)) return languageTags;

  const languagesLen = languages.length;
  for (let indx = 0; indx < languagesLen; indx++) {
    const language = languages[indx];
    let languageTag = language.code;
    if (language.region) {
      languageTag = language.code + '-' + language.region;
    }
    if (language.script) {
      languageTag = languageTag + '-' + language.script;
    }
    languageTags.push(languageTag);
  }
  return languageTags;
}
