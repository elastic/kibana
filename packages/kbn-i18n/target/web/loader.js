"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerTranslationFile = registerTranslationFile;
exports.registerTranslationFiles = registerTranslationFiles;
exports.getRegisteredLocales = getRegisteredLocales;
exports.getTranslationsByLocale = getTranslationsByLocale;
exports.getAllTranslations = getAllTranslations;
exports.getAllTranslationsFromPaths = getAllTranslationsFromPaths;

var _fs = require("fs");

var path = _interopRequireWildcard(require("path"));

var _util = require("util");

var _helper = require("./core/helper");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var asyncReadFile = (0, _util.promisify)(_fs.readFile);
var TRANSLATION_FILE_EXTENSION = '.json';
/**
 * Internal property for storing registered translations paths.
 * Key is locale, value is array of registered paths
 */

var translationsRegistry = {};
/**
 * Internal property for caching loaded translations files.
 * Key is path to translation file, value is object with translation messages
 */

var loadedFiles = {};
/**
 * Returns locale by the given translation file name
 * @param fullFileName
 * @returns locale
 * @example
 * getLocaleFromFileName('./path/to/translation/ru.json') // => 'ru'
 */

function getLocaleFromFileName(fullFileName) {
  if (!fullFileName) {
    throw new Error('Filename is empty');
  }

  var fileExt = path.extname(fullFileName);

  if (fileExt !== TRANSLATION_FILE_EXTENSION) {
    throw new Error("Translations must have 'json' extension. File being registered is ".concat(fullFileName));
  }

  return path.basename(fullFileName, TRANSLATION_FILE_EXTENSION);
}
/**
 * Loads file and parses it as JSON
 * @param pathToFile
 * @returns
 */


function loadFile(_x) {
  return _loadFile.apply(this, arguments);
}
/**
 * Loads translations files and adds them into "loadedFiles" cache
 * @param files
 * @returns
 */


function _loadFile() {
  _loadFile = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(pathToFile) {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.t0 = JSON;
            _context.next = 3;
            return asyncReadFile(pathToFile, 'utf8');

          case 3:
            _context.t1 = _context.sent;
            return _context.abrupt("return", _context.t0.parse.call(_context.t0, _context.t1));

          case 5:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _loadFile.apply(this, arguments);
}

function loadAndCacheFiles(_x2) {
  return _loadAndCacheFiles.apply(this, arguments);
}
/**
 * Registers translation file with i18n loader
 * @param translationFilePath - Absolute path to the translation file to register.
 */


function _loadAndCacheFiles() {
  _loadAndCacheFiles = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee2(files) {
    var translations;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return Promise.all(files.map(loadFile));

          case 2:
            translations = _context2.sent;
            files.forEach(function (file, index) {
              loadedFiles[file] = translations[index];
            });

          case 4:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _loadAndCacheFiles.apply(this, arguments);
}

function registerTranslationFile(translationFilePath) {
  if (!path.isAbsolute(translationFilePath)) {
    throw new TypeError('Paths to translation files must be absolute. ' + "Got relative path: \"".concat(translationFilePath, "\""));
  }

  var locale = getLocaleFromFileName(translationFilePath);
  translationsRegistry[locale] = (0, _helper.unique)([].concat(_toConsumableArray(translationsRegistry[locale] || []), [translationFilePath]));
}
/**
 * Registers array of translation files with i18n loader
 * @param arrayOfPaths - Array of absolute paths to the translation files to register.
 */


function registerTranslationFiles() {
  var arrayOfPaths = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  arrayOfPaths.forEach(registerTranslationFile);
}
/**
 * Returns an array of locales that have been registered with i18n loader
 * @returns registeredTranslations
 */


function getRegisteredLocales() {
  return Object.keys(translationsRegistry);
}
/**
 * Returns translation messages by specified locale
 * @param locale
 * @returns translation messages
 */


function getTranslationsByLocale(_x3) {
  return _getTranslationsByLocale.apply(this, arguments);
}
/**
 * Returns all translations for registered locales
 * @returns A Promise object
 * where keys are the locale and values are objects of translation messages
 */


function _getTranslationsByLocale() {
  _getTranslationsByLocale = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee3(locale) {
    var files, notLoadedFiles;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            files = translationsRegistry[locale] || [];
            notLoadedFiles = files.filter(function (file) {
              return !loadedFiles[file];
            });

            if (!notLoadedFiles.length) {
              _context3.next = 5;
              break;
            }

            _context3.next = 5;
            return loadAndCacheFiles(notLoadedFiles);

          case 5:
            if (files.length) {
              _context3.next = 7;
              break;
            }

            return _context3.abrupt("return", {
              messages: {}
            });

          case 7:
            return _context3.abrupt("return", files.reduce(function (translation, file) {
              return {
                locale: loadedFiles[file].locale || translation.locale,
                formats: loadedFiles[file].formats || translation.formats,
                messages: _objectSpread({}, loadedFiles[file].messages, translation.messages)
              };
            }, {
              locale: locale,
              messages: {}
            }));

          case 8:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _getTranslationsByLocale.apply(this, arguments);
}

function getAllTranslations() {
  return _getAllTranslations.apply(this, arguments);
}
/**
 * Registers passed translations files, loads them and returns promise with
 * all translation messages
 * @param paths - Array of absolute paths to the translation files
 * @returns A Promise object where
 * keys are the locale and values are objects of translation messages
 */


function _getAllTranslations() {
  _getAllTranslations = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee4() {
    var locales, translations;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            locales = getRegisteredLocales();
            _context4.next = 3;
            return Promise.all(locales.map(getTranslationsByLocale));

          case 3:
            translations = _context4.sent;
            return _context4.abrupt("return", locales.reduce(function (acc, locale, index) {
              return _objectSpread({}, acc, _defineProperty({}, locale, translations[index]));
            }, {}));

          case 5:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));
  return _getAllTranslations.apply(this, arguments);
}

function getAllTranslationsFromPaths(_x4) {
  return _getAllTranslationsFromPaths.apply(this, arguments);
}

function _getAllTranslationsFromPaths() {
  _getAllTranslationsFromPaths = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee5(paths) {
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            registerTranslationFiles(paths);
            _context5.next = 3;
            return getAllTranslations();

          case 3:
            return _context5.abrupt("return", _context5.sent);

          case 4:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5);
  }));
  return _getAllTranslationsFromPaths.apply(this, arguments);
}