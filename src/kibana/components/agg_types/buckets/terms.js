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

            /**
             * In order to sort by a metric agg, the metric need to be an immediate
             * decendant, this checks if that is the case.
             *
             * @type {boolean}
             */
            var metricIsOwned = bucketCountBetween(aggConfig, metricAggConfig) === 0;

            if (!metricIsOwned) {
              output.subAggs = output.subAggs || [];
              output.subAggs.push(metricAggConfig);
            }
          }
        }
      ]
    });
  };
});