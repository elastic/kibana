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

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var EN_LOCALE = 'en';
var translationsForLocale = {};
var getMessageFormat = (0, _intlFormatCache.default)(_intlMessageformat.default);
var defaultLocale = EN_LOCALE;
var currentLocale = EN_LOCALE;
var formats = _formats.formats;
_intlMessageformat.default.defaultLocale = defaultLocale;
_intlRelativeformat.default.defaultLocale = defaultLocale;
/**
 * Returns message by the given message id.
 * @param id - path to the message
 */

function getMessageById(id) {
  var translation = getTranslation();
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


function addTranslation(newTranslation) {
  var locale = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : newTranslation.locale;

  if (!locale || !(0, _helper.isString)(locale)) {
    throw new Error('[I18n] A `locale` must be a non-empty string to add messages.');
  }

  if (newTranslation.locale && newTranslation.locale !== locale) {
    throw new Error('[I18n] A `locale` in the translation object is different from the one provided as a second argument.');
  }

  var normalizedLocale = normalizeLocale(locale);
  var existingTranslation = translationsForLocale[normalizedLocale] || {
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
function translate(id, _ref) {
  var _ref$values = _ref.values,
      values = _ref$values === void 0 ? {} : _ref$values,
      defaultMessage = _ref.defaultMessage;
  var shouldUsePseudoLocale = (0, _pseudo_locale.isPseudoLocale)(currentLocale);

  if (!id || !(0, _helper.isString)(id)) {
    throw new Error('[I18n] An `id` must be a non-empty string to translate a message.');
  }

  var message = shouldUsePseudoLocale ? defaultMessage : getMessageById(id);

  if (!message && !defaultMessage) {
    throw new Error("[I18n] Cannot format message: \"".concat(id, "\". Default message must be provided."));
  }

  if (message) {
    try {
      // We should call `format` even for messages without any value references
      // to let it handle escaped curly braces `\\{` that are the part of the text itself
      // and not value reference boundaries.
      var formattedMessage = getMessageFormat(message, getLocale(), getFormats()).format(values);
      return shouldUsePseudoLocale ? (0, _pseudo_locale.translateUsingPseudoLocale)(formattedMessage) : formattedMessage;
    } catch (e) {
      throw new Error("[I18n] Error formatting message: \"".concat(id, "\" for locale: \"").concat(getLocale(), "\".\n").concat(e));
    }
  }

  try {
    var msg = getMessageFormat(defaultMessage, getDefaultLocale(), getFormats());
    return msg.format(values);
  } catch (e) {
    throw new Error("[I18n] Error formatting the default message for: \"".concat(id, "\".\n").concat(e));
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


function load(_x) {
  return _load.apply(this, arguments);
}

function _load() {
  _load = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(translationsUrl) {
    var response;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return fetch(translationsUrl, {
              credentials: 'same-origin'
            });

          case 2:
            response = _context.sent;

            if (!(response.status >= 300)) {
              _context.next = 5;
              break;
            }

            throw new Error("Translations request failed with status code: ".concat(response.status));

          case 5:
            _context.t0 = init;
            _context.next = 8;
            return response.json();

          case 8:
            _context.t1 = _context.sent;
            (0, _context.t0)(_context.t1);

          case 10:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _load.apply(this, arguments);
}