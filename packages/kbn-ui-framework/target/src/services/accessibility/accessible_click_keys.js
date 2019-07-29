"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.accessibleClickKeys = void 0;

var _key_codes = require("../key_codes");

var _accessibleClickKeys;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// These keys are used to execute click actions on interactive elements like buttons and links.
var accessibleClickKeys = (_accessibleClickKeys = {}, _defineProperty(_accessibleClickKeys, _key_codes.ENTER, 'enter'), _defineProperty(_accessibleClickKeys, _key_codes.SPACE, 'space'), _accessibleClickKeys);
exports.accessibleClickKeys = accessibleClickKeys;
