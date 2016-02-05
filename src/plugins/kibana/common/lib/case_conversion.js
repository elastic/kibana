import _ from 'lodash';

module.exports = {
  keysToSnakeCaseShallow: function (object) {
    return _.mapKeys(object, (value, key) => {
      return _.snakeCase(key);
    });
  },

  keysToCamelCaseShallow: function (object) {
    return _.mapKeys(object, (value, key) => {
      return _.camelCase(key);
    });
  }
};
