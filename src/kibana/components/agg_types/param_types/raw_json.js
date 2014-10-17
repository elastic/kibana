define(function (require) {
  return function RawJSONAggParamFactory(Private) {
    var _ = require('lodash');

    var BaseAggParam = Private(require('components/agg_types/param_types/base'));
    var editorHtml = require('text!components/agg_types/controls/raw_json.html');

    _(RawJSONAggParam).inherits(BaseAggParam);
    function RawJSONAggParam(config) {
      // force name override
      config.name = 'json';
      RawJSONAggParam.Super.call(this, config);
    }

    RawJSONAggParam.prototype.editor = editorHtml;

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
    RawJSONAggParam.prototype.write = function (aggConfig, output) {
      var param = aggConfig.params[this.name];

      // TODO:
      // - loop through aggConfig.params, clobbering anything in param

      if (!param) {
        return;
      }

      var obj = {
        pattern: param.pattern
      };

      // include any selected flags
      if (_.isArray(param.flags) && param.flags.length) {
        obj.flags = param.flags.join('|');
      }

      output.params[this.name] = obj;
    };

    return RawJSONAggParam;
  };
});