define(function (require) {
  return function TermsAggDefinition(Private) {
    var _ = require('lodash');
    var AggType = Private(require('components/agg_types/_agg_type'));
    var bucketCountBetween = Private(require('components/agg_types/buckets/_bucket_count_between'));

    return new AggType({
      name: 'terms',
      title: 'Terms',
      makeLabel: function (aggConfig) {
        var params = aggConfig.params;
        return params.order.display + ' ' + params.size + ' ' + params.field.name;
      },
      params: [
        {
          name: 'field'
        },
        {
          name: 'size',
          default: 5
          // editor: batched with order
        },
        {
          name: 'order',
          type: 'optioned',
          options: [
            { display: 'Top', val: 'desc' },
            { display: 'Bottom', val: 'asc' }
          ],
          editor: require('text!components/agg_types/controls/order_and_size.html'),
          default: 'desc',
          write: function (aggConfig, output) {
            var sort = output.params.order = {};
            var order = aggConfig.params.order.val;

            var metricAggConfig = _.first(aggConfig.vis.aggs.bySchemaGroup.metrics);

            if (metricAggConfig.type.name === 'count') {
              sort._count = order;
              return;
            }

            sort[metricAggConfig.id] = order;

            var visNotHierarchical = !aggConfig.vis.type.hierarchicalData;

            // if the vis is hierarchical, then the metric will always be copied
            // if it's not, then we need to make sure the number of buckets is 0, else wise copy it
            var metricNotChild = visNotHierarchical && bucketCountBetween(aggConfig, metricAggConfig) !== 0;

            if (metricNotChild) {
              output.subAggs = output.subAggs || [];
              output.subAggs.push(metricAggConfig);
            }
          }
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