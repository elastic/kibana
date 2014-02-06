define(function () {
  'use strict';
  return function (node) {
    if (!node) {
      return null;
    }
    var matches = node.transport_address.match(/inet\[[^\/]*\/([^\/\]]+)\]/);
    if (matches) {
      return matches[1];
    }
  };
});
