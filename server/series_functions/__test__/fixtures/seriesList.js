var Promise = require('bluebird');
var buckets = require('./bucketList');
var _ = require('lodash');

var fill = _.partial(_.zip, _.map(buckets, function (bucket) { return bucket.valueOf(); }));

module.exports = function () {
  return {
    type: 'seriesList',
    list: [{
      data:  fill([-51, 17, 82, 20]),
      type: 'series',
      label: 'Negative'
    }, {
      data: fill([100, 50, 50, 20]),
      type: 'series',
      label: 'Nice'
    },
    {
      data:  fill([1, 1, 1, 1]),
      type: 'series',
      label: 'All the same'
    },
    {
      data:  fill([3.1415926535, 2, 1.439, 0.3424235]),
      type: 'series',
      label: 'Decimauled'
    }]
  };
};
