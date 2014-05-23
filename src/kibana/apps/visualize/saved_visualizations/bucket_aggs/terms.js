define(function (require) {
  return function TermsAggDefinition() {
    var _ = require('lodash');

    var agg = this;
    agg.name = 'terms';
    agg.display = 'Terms';

    agg.makeLabel = function (params) {
      var order = _.find(agg.params.order.options, { val: params.order._count });
      return order.display + ' ' + params.size + ' ' + params.field;
    };

    agg.params = {
      size: {
        required: false,
      },
      order: {
        required: true,
        options: [
          { display: 'Top', val: 'desc' },
          { display: 'Bottom', val: 'asc' }
        ],
        default: 'desc',
        write: function (selection, output) {
          output.aggParams.order = { _count: selection.val };
        }
      }
    };
  };
});