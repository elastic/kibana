define(function (require) {
  var _ = require('lodash');
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\'': '&#39;',
    '"': '&quot;',
  };

  var regex = new RegExp('[' + _.keys(map).join('') + ']', 'g');
  return function htmlEscape(text) {
    return text.replace(regex, function (c) {
      return map[c];
    });
  };
});