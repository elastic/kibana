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
      var param = aggConfig.params[this.name];

      // clear aggParam if pattern is not set
      if (!param || !param.pattern || !param.pattern.length) {
        delete output.params[this.name];
        return;
      }

      var obj = {
        pattern: param.pattern
      };

      // include any selected flags
      if (param.flags) {
        var selectedFlags = [];
        Object.keys(param.flags).forEach(function (key) {
          if (param.flags[key]) selectedFlags.push(key);
        });

        if (selectedFlags.length) {
          obj.flags = selectedFlags.join('|');
        }
      }

      output.params[this.name] = obj;
    };

    return RegexAggParam;
  };
});