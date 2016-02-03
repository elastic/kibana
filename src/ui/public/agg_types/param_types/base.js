import _ from 'lodash';
define(function (require) {
  return function BaseAggParamFactory() {

    function BaseAggParam(config) {
      _.assign(this, config);
    }

    return BaseAggParam;
  };
});
