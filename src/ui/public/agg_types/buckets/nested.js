define(function (require) {
  return function NestedAggDefinition(Private, Notifier) {
    var _ = require('lodash');
    var angular = require('angular');
    var BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    var notif = new Notifier({ location: 'Nested Agg' });

    return new BucketAggType({
      name: 'nested',
      title: 'Nested',
      params: [ ]
    });
  };
});
