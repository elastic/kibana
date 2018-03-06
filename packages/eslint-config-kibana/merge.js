const mergeWith = require('lodash.mergewith');

function customizer(objValue, srcValue) {
  if (Array.isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

module.exports = function(...rest) {
  return mergeWith({}, ...rest, customizer);
};
