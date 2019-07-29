"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  formats: true
};
Object.defineProperty(exports, "formats", {
  enumerable: true,
  get: function () {
    return _formats.formats;
  }
});

var _formats = require("./formats");

var _i18n = require("./i18n");

Object.keys(_i18n).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _i18n[key];
    }
  });
});