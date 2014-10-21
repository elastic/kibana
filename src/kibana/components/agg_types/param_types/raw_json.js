define(function (require) {
  return function RawJSONAggParamFactory(Private) {
    var _ = require('lodash');

    var BaseAggParam = Private(require('components/agg_types/param_types/base'));
    var editorHtml = require('text!components/agg_types/controls/raw_json.html');

    _(RawJSONAggParam).inherits(BaseAggParam);
    function RawJSONAggParam(config) {
      // force name override
      config = _.defaults(config, { name: 'json' });
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
      var paramJSON;
      var param = aggConfig.params[this.name];

      if (!param) {
        return;
      }

      // handle invalid JSON input
      try {
        paramJSON = JSON.parse(param);
      } catch (err) {
        return;
      }

      _.assign(output.params, paramJSON);
      return;
    };

    return RawJSONAggParam;
  };
});