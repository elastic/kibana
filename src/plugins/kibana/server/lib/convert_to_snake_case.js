const _ = require('lodash');

module.exports = function convertToSnakeCase(object) {
  return _.mapKeys(object, (value, key) => {
    return _.snakeCase(key);
  });
};
