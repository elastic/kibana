import _ from 'lodash';
import editorHtml from 'ui/agg_types/controls/regular_expression.html';
import AggTypesParamTypesBaseProvider from 'ui/agg_types/param_types/base';
export default function RegexAggParamFactory(Private) {

  const BaseAggParam = Private(AggTypesParamTypesBaseProvider);

  _.class(RegexAggParam).inherits(BaseAggParam);
  function RegexAggParam(config) {
    _.defaults(config, { pattern: '' });
    RegexAggParam.Super.call(this, config);
  }

  RegexAggParam.prototype.editor = editorHtml;

  /**
   * Disabled state of the agg param
   *
   * @return {bool}
   */
  RegexAggParam.prototype.disabled = function () {
    return false;
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
  RegexAggParam.prototype.write = function (aggConfig, output) {
    const param = aggConfig.params[this.name];
    const paramType = aggConfig.type.params.byName[this.name];

    // clear aggParam if pattern is not set or is disabled
    if (!param || !param.pattern || !param.pattern.length || paramType.disabled(aggConfig)) {
      return;
    }

    const obj = {
      pattern: param.pattern
    };

    output.params[this.name] = obj;
  };

  return RegexAggParam;
}
