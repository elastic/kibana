define(function (require) {
  'use strict';
  var _ = require('lodash');
  return function filterByName (name) {
    return function (row) {
      if (!_.isEmpty(name)) {
        var regex = new RegExp(name, 'i');
        return (row.ip_port && regex.test(row.ip_port)) || regex.test(row.name);
      }
      return true;
    };
  };
});
