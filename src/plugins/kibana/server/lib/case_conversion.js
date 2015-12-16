const _ = require('lodash');

module.exports = {
  convertToSnakeCase: function (object) {
    return _.mapKeys(object, (value, key) => {
      return _.snakeCase(key);
    });
  },

  convertToCamelCase: function (object) {
    return _.mapKeys(object, (value, key) => {
      return _.camelCase(key);
    });
  }
};
