import expect from 'expect.js';
import _ from 'lodash';
import { join } from 'path';

import * as i18n from '../i18n/i18n';

const FIXTURES = join(__dirname, 'fixtures');

describe('i18n module', function () {

  describe('one plugin', function () {

    let registeredTranslationsPriorToTest = [];

    beforeEach('registerTranslations - one plugin', function () {
      registeredTranslationsPriorToTest = i18n.getRegisteredTranslations();
      i18n.unregisterTranslations();
      const pluginName = 'test_plugin_1';
      const pluginTranslationPath = join(FIXTURES, 'translations', pluginName);
      const translationFiles = [
        join(pluginTranslationPath, 'de.json'),
        join(pluginTranslationPath, 'en.json')
      ];
      translationFiles.forEach(i18n.registerTranslations);
    });

    afterEach('unregisterTranslations - one plugin', function () {
      i18n.unregisterTranslations();
      registeredTranslationsPriorToTest.forEach(i18n.registerTranslations);
    });

    describe('getTranslations', function () {

      it('should return the translations for en locale as registered' , function () {
        const languageTag = ['en'];
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!'
        };
        return checkTranslations(expectedTranslationJson, languageTag);
      });

      it('should return the translations for de locale as registered' , function () {
        const languageTag = ['de'];
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
        };
        return checkTranslations(expectedTranslationJson, languageTag);
      });

      it('should pick the highest priority language for which translations exist' , function () {
        const languageTags = ['es-ES', 'de', 'en'];
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults',
        };
        return checkTranslations(expectedTranslations, languageTags);
      });

      it('should return translations for highest priority locale where best case match is chosen from registered locales' , function () {
        const languageTags = ['es', 'de'];
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the es-ES dev server using HTTPS! I am regsitered afterwards!'
        };
        i18n.registerTranslations(join(FIXTURES, 'translations', 'test_plugin_1','es-ES.json'));
        return checkTranslations(expectedTranslations, languageTags);
      });

      it('should return an empty object for locales with no translations' , function () {
        const languageTags = ['es-ES', 'fr'];
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!'
        };
        return checkTranslations({}, languageTags);
      });

    });

    describe('getTranslationsForDefaultLocale', function () {

      it('should return translations for default locale which is set to the en locale' , function () {
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!'
        };
        i18n.setDefaultLocale('en');
        return checkTranslationsForDefaultLocale(expectedTranslations);
      });

      it('should return translations for the default locale which is set to the de locale' , function () {
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults',
        };
        i18n.setDefaultLocale('de');
        return checkTranslationsForDefaultLocale(expectedTranslations);
      });

    });

    describe('getRegisteredTranslationLocales', function () {

      it('should return all locales that are registered' , function () {
        const expectedLocales = ['en', 'de'];
        return checkRegisteredLocales(expectedLocales);
      });

    });

  });

  describe('multiple plugins', function () {

    let registeredTranslationsPriorToTest = [];

    beforeEach('registerTranslations - multiple plugin', function () {
      registeredTranslationsPriorToTest = i18n.getRegisteredTranslations();
      i18n.unregisterTranslations();
      const pluginTranslationPath = join(FIXTURES, 'translations');
      const translationFiles = [
        join(pluginTranslationPath, 'test_plugin_1', 'de.json'),
        join(pluginTranslationPath, 'test_plugin_1', 'en.json'),
        join(pluginTranslationPath, 'test_plugin_2', 'en.json')
      ];
      translationFiles.forEach(i18n.registerTranslations);
    });

    afterEach('unregisterTranslations - multiple plugin', function () {
      i18n.unregisterTranslations();
      registeredTranslationsPriorToTest.forEach(i18n.registerTranslations);
    });

    describe('getTranslations', function () {

      it('should return the translations for en locale as registered' , function () {
        const languageTag = ['en'];
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
        return checkTranslations(expectedTranslationJson, languageTag);
      });

      it('should return the translations for de locale as registered' , function () {
        const languageTag = ['de'];
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
        };
        return checkTranslations(expectedTranslationJson, languageTag);
      });

      it('should return the most recently registered translation for a key that has multiple translations' , function () {
        i18n.registerTranslations(join(FIXTURES, 'translations', 'test_plugin_2', 'de.json'));
        const languageTag = ['de'];
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS! I am regsitered afterwards!',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
        };
        return checkTranslations(expectedTranslationJson, languageTag);
      });

    });

    describe('getRegisteredTranslationLocales', function () {

      it('should return all locales registered', function () {
        const expectedLocales = ['en', 'de'];
        return checkRegisteredLocales(expectedLocales);
      });

    });

  });

  describe('registerTranslations', function () {

    it('should throw error when registering empty filename', function () {
      return expect(i18n.registerTranslations).withArgs('').to.throwError();
    });

    it('should throw error when registering filename with no extension', function () {
      return expect(i18n.registerTranslations).withArgs('file1').to.throwError();
    });

    it('should throw error when registering filename with non JSON extension', function () {
      return expect(i18n.registerTranslations).withArgs('file1.txt').to.throwError();
    });

  });

});

function checkTranslationsForDefaultLocale(expectedTranslations) {
  return i18n.getTranslationsForDefaultLocale()
  .then(function (actualTranslations) {
    expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
  });
}

function checkTranslations(expectedTranslations, languageTags) {
  return i18n.getTranslations(...languageTags)
  .then(function (actualTranslations) {
    expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
  });
}

function checkRegisteredLocales(expectedLocales) {
  const actualLocales = i18n.getRegisteredTranslationLocales();
  actualLocales.sort();
  expectedLocales.sort();
  expect(_.isEqual(actualLocales, expectedLocales)).to.be(true);
}
