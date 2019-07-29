"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addTranslation = addTranslation;
exports.getTranslation = getTranslation;
exports.setLocale = setLocale;
exports.getLocale = getLocale;
exports.setDefaultLocale = setDefaultLocale;
exports.getDefaultLocale = getDefaultLocale;
exports.setFormats = setFormats;
exports.getFormats = getFormats;
exports.getRegisteredLocales = getRegisteredLocales;
exports.translate = translate;
exports.init = init;
exports.load = load;

var _intlFormatCache = _interopRequireDefault(require("intl-format-cache"));

var _intlMessageformat = _interopRequireDefault(require("intl-messageformat"));

var _intlRelativeformat = _interopRequireDefault(require("intl-relativeformat"));

var _formats = require("./formats");

var _helper = require("./helper");

var _pseudo_locale = require("./pseudo_locale");

require("./locales.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const EN_LOCALE = 'en';
const translationsForLocale = {};
const getMessageFormat = (0, _intlFormatCache.default)(_intlMessageformat.default);
let defaultLocale = EN_LOCALE;
let currentLocale = EN_LOCALE;
let formats = _formats.formats;
_intlMessageformat.default.defaultLocale = defaultLocale;
_intlRelativeformat.default.defaultLocale = defaultLocale;
/**
 * Returns message by the given message id.
 * @param id - path to the message
 */

function getMessageById(id) {
  const translation = getTranslation();
  return translation.messages ? translation.messages[id] : undefined;
}
/**
 * Normalizes locale to make it consistent with IntlMessageFormat locales
 * @param locale
 */


function normalizeLocale(locale) {
  return locale.toLowerCase();
}
/**
 * Provides a way to register translations with the engine
 * @param newTranslation
 * @param [locale = messages.locale]
 */


function addTranslation(newTranslation, locale = newTranslation.locale) {
  if (!locale || !(0, _helper.isString)(locale)) {
    throw new Error('[I18n] A `locale` must be a non-empty string to add messages.');
  }

  if (newTranslation.locale && newTranslation.locale !== locale) {
    throw new Error('[I18n] A `locale` in the translation object is different from the one provided as a second argument.');
  }

  const normalizedLocale = normalizeLocale(locale);
  const existingTranslation = translationsForLocale[normalizedLocale] || {
    messages: {}
  };
  translationsForLocale[normalizedLocale] = {
    formats: newTranslation.formats || existingTranslation.formats,
    locale: newTranslation.locale || existingTranslation.locale,
    messages: _objectSpread({}, existingTranslation.messages, newTranslation.messages)
  };
}
/**
 * Returns messages for the current language
 */


function getTranslation() {
  return translationsForLocale[currentLocale] || {
    messages: {}
  };
}
/**
 * Tells the engine which language to use by given language key
 * @param locale
 */


function setLocale(locale) {
  if (!locale || !(0, _helper.isString)(locale)) {
    throw new Error('[I18n] A `locale` must be a non-empty string.');
  }

  currentLocale = normalizeLocale(locale);
}
/**
 * Returns the current locale
 */


function getLocale() {
  return currentLocale;
}
/**
 * Tells the library which language to fallback when missing translations
 * @param locale
 */


function setDefaultLocale(locale) {
  if (!locale || !(0, _helper.isString)(locale)) {
    throw new Error('[I18n] A `locale` must be a non-empty string.');
  }

  defaultLocale = normalizeLocale(locale);
  _intlMessageformat.default.defaultLocale = defaultLocale;
  _intlRelativeformat.default.defaultLocale = defaultLocale;
}

function getDefaultLocale() {
  return defaultLocale;
}
/**
 * Supplies a set of options to the underlying formatter
 * [Default format options used as the prototype of the formats]
 * {@link https://github.com/yahoo/intl-messageformat/blob/master/src/core.js#L62}
 * These are used when constructing the internal Intl.NumberFormat
 * and Intl.DateTimeFormat instances.
 * @param newFormats
 * @param [newFormats.number]
 * @param [newFormats.date]
 * @param [newFormats.time]
 */


function setFormats(newFormats) {
  if (!(0, _helper.isObject)(newFormats) || !(0, _helper.hasValues)(newFormats)) {
    throw new Error('[I18n] A `formats` must be a non-empty object.');
  }

  formats = (0, _helper.mergeAll)(formats, newFormats);
}
/**
 * Returns current formats
 */


function getFormats() {
  return formats;
}
/**
 * Returns array of locales having translations
 */


function getRegisteredLocales() {
  return Object.keys(translationsForLocale);
}

/**
 * Translate message by id
 * @param id - translation id to be translated
 * @param [options]
 * @param [options.values] - values to pass into translation
 * @param [options.defaultMessage] - will be used unless translation was successful
 */
function translate(id, {
  values = {},
  defaultMessage
}) {
  const shouldUsePseudoLocale = (0, _pseudo_locale.isPseudoLocale)(currentLocale);

  if (!id || !(0, _helper.isString)(id)) {
    throw new Error('[I18n] An `id` must be a non-empty string to translate a message.');
  }

  const message = shouldUsePseudoLocale ? defaultMessage : getMessageById(id);

  if (!message && !defaultMessage) {
    throw new Error(`[I18n] Cannot format message: "${id}". Default message must be provided.`);
  }

  if (message) {
    try {
      // We should call `format` even for messages without any value references
      // to let it handle escaped curly braces `\\{` that are the part of the text itself
      // and not value reference boundaries.
      const formattedMessage = getMessageFormat(message, getLocale(), getFormats()).format(values);
      return shouldUsePseudoLocale ? (0, _pseudo_locale.translateUsingPseudoLocale)(formattedMessage) : formattedMessage;
    } catch (e) {
      throw new Error(`[I18n] Error formatting message: "${id}" for locale: "${getLocale()}".\n${e}`);
    }
  }

  try {
    const msg = getMessageFormat(defaultMessage, getDefaultLocale(), getFormats());
    return msg.format(values);
  } catch (e) {
    throw new Error(`[I18n] Error formatting the default message for: "${id}".\n${e}`);
  }
}
/**
 * Initializes the engine
 * @param newTranslation
 */


function init(newTranslation) {
  if (!newTranslation) {
    return;
  }

  addTranslation(newTranslation);

  if (newTranslation.locale) {
    setLocale(newTranslation.locale);
  }

  if (newTranslation.formats) {
    setFormats(newTranslation.formats);
  }
}
/**
 * Loads JSON with translations from the specified URL and initializes i18n engine with them.
 * @param translationsUrl URL pointing to the JSON bundle with translations.
 */


async function load(translationsUrl) {
  // Once this package is integrated into core Kibana we should switch to an abstraction
  // around `fetch` provided by the platform, e.g. `kfetch`.
  const response = await fetch(translationsUrl, {
    credentials: 'same-origin'
  });

  if (response.status >= 300) {
    throw new Error(`Translations request failed with status code: ${response.status}`);
  }

  init((await response.json()));
}