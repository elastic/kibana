define(function (require) {
  return function ReverseNestedAggDefinition(Private, Notifier) {
    var _ = require('lodash');
    var angular = require('angular');
    var BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    var notif = new Notifier({ location: 'Reverse Nested Agg' });

    return new BucketAggType({
      name: 'reverse_nested',
      title: 'Reverse Nested',
      params: [ ]
    });
  };
});
