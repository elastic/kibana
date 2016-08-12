var argType = require('./arg_type');
var _ = require('lodash');

module.exports = function (functionDef) {
  return function validateArg(value, name, argDef) {
    var type = argType(value);
    var required = argDef.types;
    var multi = argDef.multi;
    var isCorrectType = (function () {
      // If argument is not allow to be specified multiple times, we're dealing with a plain value for type
      if (!multi) return _.contains(required, type);
      // If it is, we'll get an array for type
      return _.difference(type, required).length === 0;
    }());

    if (isCorrectType) return true;
    else return false;

    if (!isCorrectType) {
      throw new Error (functionDef.name + '(' + name + ') must be one of ' + JSON.stringify(required) + '. Got: ' + type);
    }
  };
};
