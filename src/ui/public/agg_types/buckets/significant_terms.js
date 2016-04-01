define(function (require) {
  return function SignificantTermsAggDefinition(Private) {
    let _ = require('lodash');
    let BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    let createFilter = Private(require('ui/agg_types/buckets/create_filter/terms'));

    return new BucketAggType({
      name: 'significant_terms',
      title: 'Significant Terms',
      makeLabel: function (aggConfig) {
        return 'Top ' + aggConfig.params.size + ' unusual terms in ' + aggConfig.params.field.displayName;
      },
      createFilter: createFilter,
      params: [
        {
          name: 'field',
          filterFieldTypes: 'string'
        },
        {
          name: 'size',
          editor: require('ui/agg_types/controls/order_and_size.html'),
        },
        {
          name: 'exclude',
          type: 'regex',
          advanced: true
        },
        {
          name: 'include',
          type: 'regex',
          advanced: true
        }
      ]
    });
  };
});
