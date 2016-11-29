var getSeries = require('../helpers/get_series');
var getSeriesList = require('../helpers/get_series_list');
var _ = require('lodash');

module.exports = function (name, data) {
  return getSeriesList([getSeries(name, _.map(data, 0), _.map(data, 1))]);
};
