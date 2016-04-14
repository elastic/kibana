define(function (require) {
  return function BaseAggParamFactory() {
    let _ = require('lodash');

    function BaseAggParam(config) {
      _.assign(this, config);
    }

    return BaseAggParam;
  };
});
