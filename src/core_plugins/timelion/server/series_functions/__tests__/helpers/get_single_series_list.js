let getSeries = require('../helpers/get_series');
let getSeriesList = require('../helpers/get_series_list');
let _ = require('lodash');

module.exports = function (name, data) {
  return getSeriesList([getSeries(name, _.map(data, 0), _.map(data, 1))]);
};
