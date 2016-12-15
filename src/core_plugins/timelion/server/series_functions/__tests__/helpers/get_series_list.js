const _ = require('lodash');

module.exports = function (list, overrides) {
  return _.merge({
    type: 'seriesList',
    list: list
  }, overrides);
};
