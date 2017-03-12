const Promise = require('bluebird');
const buckets = require('./bucketList');
const getSeries = require('../helpers/get_series');
const getSeriesList = require('../helpers/get_series_list');
const _ = require('lodash');

module.exports = function () {
  return getSeriesList([
    getSeries('Negative', buckets,     [-51, 17, 82, 20]),
    getSeries('Nice', buckets,         [100, 50, 50, 20]),
    getSeries('All the same', buckets, [1, 1, 1, 1]),
    getSeries('Decimals', buckets,     [3.1415926535, 2, 1.439, 0.3424235]),
    getSeries('PowerOfTen', buckets,   [10, 100, 10, 1]),
  ]);
};
