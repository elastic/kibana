define(function (require) {
  return function TermsAggDefinition(Private) {
    var _ = require('lodash');
    var AggType = Private(require('components/agg_types/_agg_type'));

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
            // TODO: We need more than just _count here.
            output.params.order = {
              _count: aggConfig.params.order.val
            };
          }
        }
      ]
    });
  };
});