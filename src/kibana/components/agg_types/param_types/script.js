define(function (require) {
  return function ScriptAggParamFactory(Private) {
    var _ = require('lodash');

    var BaseAggParam = Private(require('components/agg_types/param_types/base'));

    _(ScriptAggParam).inherits(BaseAggParam);
    function ScriptAggParam(config) {
      ScriptAggParam.Super.call(this, config);
    }

    ScriptAggParam.prototype.editor = null;

    ScriptAggParam.prototype.serialize = function (script) {
      return script.name;
    };

    ScriptAggParam.prototype.deserialize = function (fieldName, aggConfig) {
      return aggConfig.vis.indexPattern.scriptedFields.byName[fieldName];
    };

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
    ScriptAggParam.prototype.write = function (aggConfig, output) {
      var script = aggConfig.params.script;

      if (script) {
        output.params.script = script.script;
      }
    };

    return ScriptAggParam;
  };
});