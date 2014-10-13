define(function (require) {
  return function RegexAggParamFactory(Private) {
    var _ = require('lodash');

    var BaseAggParam = Private(require('components/agg_types/param_types/base'));

    _(RegexAggParam).inherits(BaseAggParam);
    function RegexAggParam(config) {
      RegexAggParam.Super.call(this, config);
    }

    /**
     * Write the aggregation parameter.
     *
     * @param  {AggConfig} aggConfig - the entire configuration for this agg
     * @param  {object} output - the result of calling write on all of the aggregations
     *                         parameters.
     * @param  {object} output.params - the final object that will be included as the params
     *                               for the agg
     * @return {undefined}
     */
    RegexAggParam.prototype.write = function (aggConfig, output) {
      output.params[this.name] = aggConfig.params[this.name];
    };

    return RegexAggParam;
  };
});