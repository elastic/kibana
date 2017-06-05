import expect from 'expect.js';
import _ from 'lodash';
import { join } from 'path';

import { I18n } from '../';

const FIXTURES = join(__dirname, 'fixtures');

describe('ui/i18n module', function () {

  describe('one plugin', function () {

    const i18nObj = new I18n();

    before('registerTranslations - one plugin', function () {
      const pluginName = 'test_plugin_1';
      const pluginTranslationPath = join(FIXTURES, 'translations', pluginName);
      const translationFiles = [
        join(pluginTranslationPath, 'de.json'),
        join(pluginTranslationPath, 'en.json')
      ];
      const filesLen = translationFiles.length;
      for (let indx = 0; indx < filesLen; indx++) {
        i18nObj.registerTranslations(translationFiles[indx]);
      }
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
        return checkTranslations(expectedTranslationJson, languageTag, i18nObj);
      });

      it('should return the translations for de locale as registered' , function () {
        const languageTag = ['de'];
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
        };
        return checkTranslations(expectedTranslationJson, languageTag, i18nObj);
      });

      it('should pick the highest priority language for which translations exist' , function () {
        const languageTags = ['es-ES', 'de', 'en'];
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults',
        };
        return checkTranslations(expectedTranslations, languageTags, i18nObj);
      });

      it('should return translations for highest priority locale where best case match is chosen from registered locales' , function () {
        const languageTags = ['es', 'de'];
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the es-ES dev server using HTTPS! I am regsitered afterwards!'
        };
        i18nObj.registerTranslations(join(FIXTURES, 'translations', 'test_plugin_1','es-ES.json'));
        return checkTranslations(expectedTranslations, languageTags, i18nObj);
      });

      it('should return an empty object for locales with no translations' , function () {
        const languageTags = ['ja-JA', 'fr'];
        return checkTranslations({}, languageTags, i18nObj);
      });

    });

    describe('getTranslationsForDefaultLocale', function () {

      it('should return translations for default locale which is set to the en locale' , function () {
        const i18nObj1 = new I18n('en');
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!'
        };
        i18nObj1.registerTranslations(join(FIXTURES, 'translations', 'test_plugin_1','en.json'));
        return checkTranslationsForDefaultLocale(expectedTranslations, i18nObj1);
      });

      it('should return translations for default locale which is set to the de locale' , function () {
        const i18nObj1 = new I18n('de');
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults',
        };
        i18nObj1.registerTranslations(join(FIXTURES, 'translations', 'test_plugin_1','de.json'));
        return checkTranslationsForDefaultLocale(expectedTranslations, i18nObj1);
      });

    });

    describe('getAllTranslations', function () {

      it('should return all translations' , function () {
        const expectedTranslations = {
          de: {
            'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
            'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
          },
          en: {
            'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
            'test_plugin_1-DEV': 'Run the server with development mode defaults',
            'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
            'test_plugin_1-HOME': 'Run along home now!'
          },
          'es-ES': {
            'test_plugin_1-NO_SSL': 'Dont run the es-ES dev server using HTTPS! I am regsitered afterwards!'
          }
        };
        return checkAllTranslations(expectedTranslations, i18nObj);
      });

    });

  });

  describe('multiple plugins', function () {

    const i18nObj = new I18n();

    beforeEach('registerTranslations - multiple plugin', function () {
      const pluginTranslationPath = join(FIXTURES, 'translations');
      const translationFiles = [
        join(pluginTranslationPath, 'test_plugin_1', 'de.json'),
        join(pluginTranslationPath, 'test_plugin_1', 'en.json'),
        join(pluginTranslationPath, 'test_plugin_2', 'en.json')
      ];
      const filesLen = translationFiles.length;
      for (let indx = 0; indx < filesLen; indx++) {
        i18nObj.registerTranslations(translationFiles[indx]);
      }
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
        return checkTranslations(expectedTranslationJson, languageTag, i18nObj);
      });

      it('should return the translations for de locale as registered' , function () {
        const languageTag = ['de'];
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
        };
        return checkTranslations(expectedTranslationJson, languageTag, i18nObj);
      });

      it('should return the most recently registered translation for a key that has multiple translations' , function () {
        i18nObj.registerTranslations(join(FIXTURES, 'translations', 'test_plugin_2', 'de.json'));
        const languageTag = ['de'];
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS! I am regsitered afterwards!',
          'test_plugin_1-DEV': 'Run the DE server with development mode defaults'
        };
        return checkTranslations(expectedTranslationJson, languageTag, i18nObj);
      });

    });

  });

  describe('registerTranslations', function () {

    const i18nObj = new I18n();

    it('should throw error when registering relative path', function () {
      return expect(i18nObj.registerTranslations).withArgs('./some/path').to.throwError();
    });

    it('should throw error when registering empty filename', function () {
      return expect(i18nObj.registerTranslations).withArgs('').to.throwError();
    });

    it('should throw error when registering filename with no extension', function () {
      return expect(i18nObj.registerTranslations).withArgs('file1').to.throwError();
    });

    it('should throw error when registering filename with non JSON extension', function () {
      return expect(i18nObj.registerTranslations).withArgs('file1.txt').to.throwError();
    });

  });

});

function checkTranslations(expectedTranslations, languageTags, i18nObj) {
  return i18nObj.getTranslations(...languageTags)
  .then(function (actualTranslations) {
    expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
  });
}

function checkAllTranslations(expectedTranslations, i18nObj) {
  return i18nObj.getAllTranslations()
  .then(function (actualTranslations) {
    expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
  });
}

function checkTranslationsForDefaultLocale(expectedTranslations, i18nObj) {
  return i18nObj.getTranslationsForDefaultLocale()
  .then(function (actualTranslations) {
    expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
  });
}
