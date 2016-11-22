import expect from 'expect.js';
import _ from 'lodash';
import { join } from 'path';

import * as i18n from '../i18n/i18n';

const FIXTURES = join(__dirname, 'fixtures');

describe('i18n module', function () {

  describe('one plugin', function () {

    beforeEach('registerTranslations - one plugin', function () {
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
    });

    describe('getTranslationsForLocale', function () {

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

      it('should first return empty object for no locale registered and ' +
         'then return translations for default locale as requested' , function () {
        const languageTags = ['es-ES', 'fr'];
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!'
        };
        i18n.setDefaultLocale('en');
        checkTranslations({}, languageTags);
        return checkTranslationsForDefaultLocale(expectedTranslations);
      });

      it('should first return empty object for no locale registered and then return translations for the' +
         'default locale which is set to the de locale' , function () {
        const languageTag = ['es-ES'];
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults',
        };
        i18n.setDefaultLocale('de');
        checkTranslations({}, languageTag);
        return checkTranslationsForDefaultLocale(expectedTranslations);
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
        const pluginName = 'test_plugin_1';
        const pluginTranslationPath = join(FIXTURES, 'translations', pluginName);
        const translationFiles = [ join(pluginTranslationPath, 'es-ES.json') ];
        translationFiles.forEach(i18n.registerTranslations);

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

    describe('getRegisteredTranslationLocales', function () {

      it('should return all locales that are registered' , function () {
        const expectedLocales = ['en', 'de'];
        return checkRegisteredLocales(expectedLocales);
      });

    });

  });

  describe('multiple plugins', function () {

    beforeEach('registerTranslations - multiple plugin', function () {
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
    });

    describe('getTranslationsForLocale', function () {

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
        const pluginName = 'test_plugin_2';
        const pluginTranslationPath = join(FIXTURES, 'translations', pluginName);
        const translationFiles = [ join(pluginTranslationPath, 'de.json') ];
        translationFiles.forEach(i18n.registerTranslations);
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

    it('should throw error when regsitering empty filename', function () {
      return expect(i18n.registerTranslations).withArgs('').to.throwError();
    });

    it('should throw error when regsitering filename with no extension', function () {
      return expect(i18n.registerTranslations).withArgs('file1').to.throwError();
    });

    it('should throw error when regsitering filename with non JSON extension', function () {
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
  return i18n.getTranslations.apply(this, languageTags)
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
