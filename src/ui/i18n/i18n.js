import path from 'path';
import Promise from 'bluebird';
import { readFile } from 'fs';
import _ from 'lodash';

const asyncReadFile = Promise.promisify(readFile);

const TRANSLATION_FILE_EXTENSION = '.json';

function getLocaleFromFileName(fullFileName) {
  if (_.isEmpty(fullFileName)) throw new Error('Filename empty');

  const fileExt = path.extname(fullFileName);
  if (fileExt.length <= 0 || fileExt !== TRANSLATION_FILE_EXTENSION) {
    throw new Error('Translations must be in a JSON file. File being registered is ' + fullFileName);
  }

  return path.basename(fullFileName, TRANSLATION_FILE_EXTENSION);
}

function getBestLocaleMatch(languageTag, registeredLocales) {
  if (_.contains(registeredLocales, languageTag)) {
    return languageTag;
  }

  // Find the first registered locale that begins with one of the language codes from the provided language tag.
  // For example, if there is an 'en' language code, it would match an 'en-US' registered locale.
  const languageCode = _.first(languageTag.split('-')) || [];
  return _.find(registeredLocales, (locale) => _.startsWith(locale, languageCode));
}

export class I18n {

  _registeredTranslations = {};

  constructor(defaultLocale = 'en') {
    this._defaultLocale = defaultLocale;
  }

  /**
   * Return all translations for registered locales
   * @return {Promise<Object>} translations - A Promise object where keys are
   *                                          the locale and values are Objects
   *                                          of translation keys and translations
   */
  getAllTranslations() {
    const localeTranslations = {};

    const locales = this._getRegisteredTranslationLocales();
    const translations = _.map(locales, (locale) => {
      return this._getTranslationsForLocale(locale)
      .then(function (translations) {
        localeTranslations[locale] = translations;
      });
    });

    return Promise.all(translations)
    .then(() => _.assign({}, localeTranslations));
  }

  /**
   * Return translations for a suitable locale from a user side locale list
   * @param {...string} languageTags -  BCP 47 language tags. The tags are listed in priority order as set in the Accept-Language header.
   * @returns {Promise<Object>} translations - promise for an object where
   *                                           keys are translation keys and
   *                                           values are translations
   * This object will contain all registered translations for the highest priority locale which is registered with the i18n module.
   * This object can be empty if no locale in the language tags can be matched against the registered locales.
   */
  getTranslations(...languageTags) {
    const locale = this._getTranslationLocale(languageTags);
    return this._getTranslationsForLocale(locale);
  }

  /**
   * Return all translations registered for the default locale.
   * @returns {Promise<Object>} translations - promise for an object where
   *                                           keys are translation keys and
   *                                           values are translations
   */
  getTranslationsForDefaultLocale() {
    return this._getTranslationsForLocale(this._defaultLocale);
  }

  /**
   * The translation file is registered with i18n plugin. The plugin contains a list of registered translation file paths per language.
   * @param {String} absolutePluginTranslationFilePath - Absolute path to the translation file to register.
   */
  registerTranslations(absolutePluginTranslationFilePath) {
    if (!path.isAbsolute(absolutePluginTranslationFilePath)) {
      throw new TypeError(
        'Paths to translation files must be absolute. ' +
        `Got relative path: "${absolutePluginTranslationFilePath}"`
      );
    }

    const locale = getLocaleFromFileName(absolutePluginTranslationFilePath);

    this._registeredTranslations[locale] =
      _.uniq(_.get(this._registeredTranslations, locale, []).concat(absolutePluginTranslationFilePath));
  }

  _getRegisteredTranslationLocales() {
    return Object.keys(this._registeredTranslations);
  }

  _getTranslationLocale(languageTags) {
    let locale = '';
    const registeredLocales = this._getRegisteredTranslationLocales();
    _.forEach(languageTags, (tag) => {
      locale = locale || getBestLocaleMatch(tag, registeredLocales);
    });
    return locale;
  }

  _getTranslationsForLocale(locale) {
    if (!this._registeredTranslations.hasOwnProperty(locale)) {
      return Promise.resolve({});
    }

    const translationFiles = this._registeredTranslations[locale];
    const translations = _.map(translationFiles, (filename) => {
      return asyncReadFile(filename, 'utf8')
      .then(fileContents => JSON.parse(fileContents))
      .catch(SyntaxError, function () {
        throw new Error('Invalid json in ' + filename);
      })
      .catch(function () {
        throw new Error('Cannot read file ' + filename);
      });
    });

    return Promise.all(translations)
    .then(translations => _.assign({}, ...translations));
  }
}
