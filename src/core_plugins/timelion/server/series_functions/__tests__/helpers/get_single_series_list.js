const getSeries = require('../helpers/get_series');
const getSeriesList = require('../helpers/get_series_list');
const _ = require('lodash');

module.exports = function (name, data) {
  return getSeriesList([getSeries(name, _.map(data, 0), _.map(data, 1))]);
};
