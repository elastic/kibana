define(function () {
  'use strict';
  return function extractIds (link) {
    var matches = link.url.match(/([^\/]+.json)$/);
    if (matches) {
      return matches[1];
    }
  };
});
