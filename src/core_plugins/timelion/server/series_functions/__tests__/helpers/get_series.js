import _ from 'lodash';

module.exports = function getSeries(name, buckets, points) {
  const fill = _.partial(_.zip, _.map(buckets, function (bucket) { return bucket.valueOf(); }));
  return {
    data:  fill(points),
    type: 'series',
    label: name
  };
};
