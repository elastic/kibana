var _ = require('lodash');

module.exports = function getSeries(name, buckets, points) {
  var fill = _.partial(_.zip, _.map(buckets, function (bucket) { return bucket.valueOf(); }));
  return {
    data:  fill(points),
    type: 'series',
    label: name
  };
};
