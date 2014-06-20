define(function (require) {
  return function SignificantTermsAggDefinition() {
    var _ = require('lodash');

    var agg = this;
    agg.name = 'significant_terms';
    agg.display = 'Significant Terms';

    agg.makeLabel = function (params) {
      return 'Top ' + params.size + ' unusual terms in ' + params.field;
    };

    agg.params = {
      size: {
        required: false,
      }
    };
  };
});