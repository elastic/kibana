const _ = require('lodash');

export default function cleanDeep(object) {
  _.forIn(object, function(value, key) {
    if (_.isObject(value)) {
      cleanDeep(value);
    }
    if (_.isUndefined(value)) {
      delete object[key];
    }
  });
}
