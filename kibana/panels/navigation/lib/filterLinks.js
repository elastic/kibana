define(function (require) {
  'use strict';
  var $ = require("jquery");
  var a = $('<a />');
  return function (current) {
    return function filterLinks (link) {
      a.attr("href", link.url);
      return a[0].href !== current;
    };
  };
});
