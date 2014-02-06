// The function is needed because in Elasticsaerch 0.90.x field data is just a string
// but in 1.x it's the first element in an array. So we need a way to access it depending
// on the version.
define(function (require) {
  'use strict';
  var _ = require('lodash');
  return function (item) {
    return _.isArray(item) ? item[0] : item;
  };
});

