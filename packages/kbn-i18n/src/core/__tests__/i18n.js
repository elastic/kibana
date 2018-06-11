/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';
import _ from 'lodash';
import { join } from 'path';

import { I18nLoader } from '../loader';

const FIXTURES = join(__dirname, 'fixtures');

describe('kbn/i18n module', function() {
  describe('one plugin', function() {
    const i18nObj = new I18nLoader();

    before('registerTranslationFile - one plugin', function() {
      const pluginName = 'test_plugin_1';
      const pluginTranslationPath = join(FIXTURES, 'translations', pluginName);
      const translationFiles = [
        join(pluginTranslationPath, 'de.json'),
        join(pluginTranslationPath, 'en.json'),
      ];
      i18nObj.registerTranslationFiles(translationFiles);
    });

    describe('getTranslations', function() {
      it('should return the translations for en locale as registered', function() {
        const langHeader = 'en';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!',
        };
        return checkTranslations(expectedTranslationJson, langHeader, i18nObj);
      });

      it('should return the translations for de locale as registered', function() {
        const langHeader = 'de';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV':
            'Run the DE server with development mode defaults',
        };
        return checkTranslations(expectedTranslationJson, langHeader, i18nObj);
      });

      it('should pick the highest priority language for which translations exist', function() {
        const langHeader = 'es-ES,de;q=0.9,en;q=0.8';
        const expectedTranslations = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV':
            'Run the DE server with development mode defaults',
        };
        return checkTranslations(expectedTranslations, langHeader, i18nObj);
      });

      it('should return translations for highest priority locale where best case match is chosen from registered locales', function() {
        const langHeader = 'es,de;q=0.9';
        const expectedTranslations = {
          'test_plugin_1-NO_SSL':
            'Dont run the es-ES dev server using HTTPS! I am regsitered afterwards!',
        };
        i18nObj.registerTranslationFile(
          join(FIXTURES, 'translations', 'test_plugin_1', 'es-ES.json')
        );
        return checkTranslations(expectedTranslations, langHeader, i18nObj);
      });

      it('should return an empty object for locales with no translations', function() {
        const langHeader = 'ja-JA,fr;q=0.9';
        return checkTranslations({}, langHeader, i18nObj);
      });
    });

    describe('getAllTranslations', function() {
      it('should return all translations', function() {
        const expectedTranslations = {
          de: {
            'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
            'test_plugin_1-DEV':
              'Run the DE server with development mode defaults',
          },
          en: {
            'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
            'test_plugin_1-DEV':
              'Run the server with development mode defaults',
            'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
            'test_plugin_1-HOME': 'Run along home now!',
          },
          'es-ES': {
            'test_plugin_1-NO_SSL':
              'Dont run the es-ES dev server using HTTPS! I am regsitered afterwards!',
          },
        };
        return checkAllTranslations(expectedTranslations, i18nObj);
      });
    });
  });

  describe('multiple plugins', function() {
    const i18nObj = new I18nLoader();

    beforeEach('registerTranslationFile - multiple plugin', function() {
      const pluginTranslationPath = join(FIXTURES, 'translations');
      const translationFiles = [
        join(pluginTranslationPath, 'test_plugin_1', 'de.json'),
        join(pluginTranslationPath, 'test_plugin_1', 'en.json'),
        join(pluginTranslationPath, 'test_plugin_2', 'en.json'),
      ];
      i18nObj.registerTranslationFiles(translationFiles);
    });

    describe('getTranslations', function() {
      it('should return the translations for en locale as registered', function() {
        const langHeader = 'en';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the dev server using HTTPS',
          'test_plugin_1-DEV': 'Run the server with development mode defaults',
          'test_plugin_1-NO_RUN_SERVER': 'Dont run the dev server',
          'test_plugin_1-HOME': 'Run along home now!',
          'test_plugin_2-XXXXXX': 'This is XXXXXX string',
          'test_plugin_2-YYYY_PPPP': 'This is YYYY_PPPP string',
          'test_plugin_2-FFFFFFFFFFFF': 'This is FFFFFFFFFFFF string',
          'test_plugin_2-ZZZ': 'This is ZZZ string',
        };
        return checkTranslations(expectedTranslationJson, langHeader, i18nObj);
      });

      it('should return the translations for de locale as registered', function() {
        const langHeader = 'de';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL': 'Dont run the DE dev server using HTTPS',
          'test_plugin_1-DEV':
            'Run the DE server with development mode defaults',
        };
        return checkTranslations(expectedTranslationJson, langHeader, i18nObj);
      });

      it('should return the most recently registered translation for a key that has multiple translations', function() {
        i18nObj.registerTranslationFile(
          join(FIXTURES, 'translations', 'test_plugin_2', 'de.json')
        );
        const langHeader = 'de';
        const expectedTranslationJson = {
          'test_plugin_1-NO_SSL':
            'Dont run the DE dev server using HTTPS! I am regsitered afterwards!',
          'test_plugin_1-DEV':
            'Run the DE server with development mode defaults',
        };
        return checkTranslations(expectedTranslationJson, langHeader, i18nObj);
      });
    });
  });

  describe('registerTranslationFile', function() {
    const i18nObj = new I18nLoader();

    it('should throw error when registering relative path', function() {
      return expect(i18nObj.registerTranslationFile)
        .withArgs('./some/path')
        .to.throwError();
    });

    it('should throw error when registering empty filename', function() {
      return expect(i18nObj.registerTranslationFile)
        .withArgs('')
        .to.throwError();
    });

    it('should throw error when registering filename with no extension', function() {
      return expect(i18nObj.registerTranslationFile)
        .withArgs('file1')
        .to.throwError();
    });

    it('should throw error when registering filename with non JSON extension', function() {
      return expect(i18nObj.registerTranslationFile)
        .withArgs('file1.txt')
        .to.throwError();
    });
  });
});

function checkTranslations(expectedTranslations, langHeader, i18nObj) {
  return i18nObj
    .getTranslationsByLanguageHeader(langHeader)
    .then(function(actualTranslations) {
      expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
    });
}

function checkAllTranslations(expectedTranslations, i18nObj) {
  return i18nObj.getAllTranslations().then(function(actualTranslations) {
    expect(_.isEqual(actualTranslations, expectedTranslations)).to.be(true);
  });
}
