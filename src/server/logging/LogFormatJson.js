'use strict';

let LogFormat = require('./LogFormat');
let stringify = require('json-stringify-safe');

let stripColors = function (string) {
  return string.replace(/\u001b[^m]+m/g, '');
};

module.exports = class KbnLoggerJsonFormat extends LogFormat {
  format(data) {
    data.message = stripColors(data.message);
    return stringify(data);
  }
};
