'use strict';

var postcss = require('postcss');

module.exports = function () {
  return function (css) {
    var metCharset = false;
    css.eachAtRule(function (atRule) {
      if (atRule.name !== 'charset') {
        return;
      }

      if (!metCharset) {
        metCharset = true;
        atRule.parent.prepend(atRule.clone());
      }

      atRule.removeSelf();
    });
  };
};
