define(function (require) {
  return function BaseAggParamFactory() {
    var _ = require('lodash');

    function BaseAggParam(config) {
      _.assign(this, config);
    }

    return BaseAggParam;
  };
});