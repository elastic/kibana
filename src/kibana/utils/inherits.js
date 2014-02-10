define(function (require) {
  var _ = require('lodash');

  return function (Child, Parent) {
    Child.prototype = _.create(Parent.prototype, { 'constructor': Parent });
  };
});