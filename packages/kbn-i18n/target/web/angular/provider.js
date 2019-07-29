"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.I18nProvider = void 0;

var i18n = _interopRequireWildcard(require("../core"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var I18nProvider = function I18nProvider() {
  _classCallCheck(this, I18nProvider);

  _defineProperty(this, "addTranslation", i18n.addTranslation);

  _defineProperty(this, "getTranslation", i18n.getTranslation);

  _defineProperty(this, "setLocale", i18n.setLocale);

  _defineProperty(this, "getLocale", i18n.getLocale);

  _defineProperty(this, "setDefaultLocale", i18n.setDefaultLocale);

  _defineProperty(this, "getDefaultLocale", i18n.getDefaultLocale);

  _defineProperty(this, "setFormats", i18n.setFormats);

  _defineProperty(this, "getFormats", i18n.getFormats);

  _defineProperty(this, "getRegisteredLocales", i18n.getRegisteredLocales);

  _defineProperty(this, "init", i18n.init);

  _defineProperty(this, "load", i18n.load);

  _defineProperty(this, "$get", function () {
    return i18n.translate;
  });
};

exports.I18nProvider = I18nProvider;