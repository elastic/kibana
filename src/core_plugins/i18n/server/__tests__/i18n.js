import expect from 'expect.js';
import * as i18n from '../i18n/i18n';
import path from 'path';
import _ from 'lodash';

const FIXTURES = path.join(__dirname, 'fixtures');

describe('i18n module', function () {
  before('registerTranslations - one plugin', function () {
    const pluginName = 'test_plugin_1';
    const pluginTranslationPath = path.join(FIXTURES, 'translations', pluginName);
    const translationFiles = [
      path.join(pluginTranslationPath, 'de.json'),
      path.join(pluginTranslationPath, 'en.json')
    ];
    registerTranslations(translationFiles);
  });
  describe('one plugin', function () {
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
      });
      it('de translations are registered' , function () {
        const locale = 'de';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
        };
        checkTranslations(locale, expectedTranslationJson);
      });
      it('es translations not registered' , function () {
        const locale = 'es';
        checkTranslations(locale, null);
      });
    });
    describe('getRegisteredTranslationLocales', function () {
      it('Translation locales are registered', function () {
        const expectedLocales = ['en', 'de'];
        checkRegisteredLocales(expectedLocales);
      });
    });
    describe('getTranslationsForLocales', function () {
      it('de translations should be chosen' , function () {
        const locales = [
          { code: 'es', region: 'ES', quality: 1.0 },
          { code: 'de', region: undefined, quality: 0.8 }
        ];
        const defaultLocale = 'en';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults',
        };
        checkTranslationsForLocales(locales, defaultLocale, expectedTranslationJson);
      });
      it('default locale  translations should be chosen' , function () {
        const locales = [
          { code: 'es', region: 'ES', quality: 1.0 },
          { code: 'fr', region: undefined, quality: 0.8 }
        ];
        const defaultLocale = 'en';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!'
        };
        checkTranslationsForLocales(locales, defaultLocale, expectedTranslationJson);
      });
      it('no translations as no locales or default loale registered' , function () {
        const locales = [
          { code: 'es', region: 'ES', quality: 1.0 },
          { code: 'fr', region: undefined, quality: 0.8 }
        ];
        const defaultLocale = 'jp';
        checkTranslationsForLocales(locales, defaultLocale, null);
      });
    });
  });
  describe('multiple plugins', function () {
    before('registerTranslations - another plugin', function () {
      const pluginName = 'test_plugin_2';
      const pluginTranslationPath = path.join(FIXTURES, 'translations', pluginName);
      const translationFiles = [
        path.join(pluginTranslationPath, 'en.json')
      ];
      registerTranslations(translationFiles);
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
      });
      it('de translations are registered' , function () {
        const locale = 'de';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
        };
        checkTranslations(locale, expectedTranslationJson);
      });
    });
    describe('getRegisteredTranslationLocales', function () {
      it('Translation locales are registered', function () {
        const expectedLocales = ['en', 'de'];
        checkRegisteredLocales(expectedLocales);
      });
    });
  });
});

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

function checkTranslations(locale, expectedTranslations) {
  return i18n.getTranslationsForLocale(locale).then(function (actualTranslations) {
    expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
  });
}

function checkTranslationsForLocales(acceptLanguages, defaultLocale, expectedTranslations) {
  return i18n.getTranslationsForLocales(acceptLanguages, defaultLocale).then(function (actualTranslations) {
    expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
  });
}

function registerTranslations(pluginTranslationFiles) {
  const numFiles = pluginTranslationFiles.length;
  for (let indx = 0; indx < numFiles; indx++) {
    i18n.registerTranslations(pluginTranslationFiles[indx]);
  }
}

function checkRegisteredLocales(expectedLocales) {
  const actualLocales = i18n.getRegisteredTranslationLocales();
  actualLocales.sort();
  expectedLocales.sort();
  expect(_.isEqual(actualLocales, expectedLocales)).to.be(true);
}
