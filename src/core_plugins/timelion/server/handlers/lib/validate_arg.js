import argType from './arg_type';
import _ from 'lodash';

module.exports = function (functionDef) {
  return function validateArg(value, name, argDef) {
    const type = argType(value);
    const required = argDef.types;
    const multi = argDef.multi;
    const isCorrectType = (function () {
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
