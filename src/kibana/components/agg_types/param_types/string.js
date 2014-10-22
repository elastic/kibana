define(function (require) {
  return function FieldAggParamFactory(Private) {
    var _ = require('lodash');

    var editorHtml = require('text!components/agg_types/controls/string.html');
    var BaseAggParam = Private(require('components/agg_types/param_types/base'));

    _(ScriptAggParam).inherits(BaseAggParam);
    function ScriptAggParam(config) {
      ScriptAggParam.Super.call(this, config);
    }

    ScriptAggParam.prototype.editor = editorHtml;

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
      if (aggConfig.params[this.name] && aggConfig.params[this.name].length)
        output.params[this.name] = aggConfig.params[this.name];
    };

    return ScriptAggParam;
  };
});