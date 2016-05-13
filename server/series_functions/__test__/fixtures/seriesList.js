var Promise = require('bluebird');
var buckets = require('./bucketList');
var _ = require('lodash');

module.exports = function () {
  return {
    type: 'seriesList',
    list: [
      getSeries('Negative',     [-51, 17, 82, 20]),
      getSeries('Nice',         [100, 50, 50, 20]),
      getSeries('All the same', [1, 1, 1, 1]),
      getSeries('Decimals',     [3.1415926535, 2, 1.439, 0.3424235])
    ]
  };
};

function getSeries(name, points) {
  var fill = _.partial(_.zip, _.map(buckets, function (bucket) { return bucket.valueOf(); }));
  return {
    data:  fill(points),
    type: 'series',
    label: name
  };
}
