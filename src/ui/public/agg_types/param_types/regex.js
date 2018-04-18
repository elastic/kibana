import _ from 'lodash';
import editorHtml from '../controls/regular_expression.html';
import { BaseParamType } from './base';
import { createLegacyClass } from '../../utils/legacy_class';

createLegacyClass(RegexParamType).inherits(BaseParamType);
function RegexParamType(config) {
  _.defaults(config, { pattern: '' });
  RegexParamType.Super.call(this, config);
}

RegexParamType.prototype.editor = editorHtml;

/**
 * Disabled state of the agg param
 *
 * @return {bool}
 */
RegexParamType.prototype.disabled = function () {
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
RegexParamType.prototype.write = function (aggConfig, output) {
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

export { RegexParamType };
