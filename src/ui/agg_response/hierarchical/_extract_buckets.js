define(function (require) {
  var _ = require('lodash');
  return function (bucket) {
    if (bucket && _.isPlainObject(bucket.buckets)) {
      return _.map(bucket.buckets, function (value, key) {
        var item = _.cloneDeep(value);
        item.key = key;
        return item;
      });

    } else {
      return bucket && bucket.buckets || [];
    }
  };
});
