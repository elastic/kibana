define(function (require) {
  'use strict';
  var _ = require('lodash');
  return function (item)  {
    return _.some(item.children, { primary: true });
  };
});
