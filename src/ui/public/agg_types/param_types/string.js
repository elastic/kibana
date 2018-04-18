import editorHtml from '../controls/string.html';
import { BaseParamType } from './base';
import { createLegacyClass } from '../../utils/legacy_class';

createLegacyClass(StringParamType).inherits(BaseParamType);
function StringParamType(config) {
  StringParamType.Super.call(this, config);
}

StringParamType.prototype.editor = editorHtml;

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
StringParamType.prototype.write = function (aggConfig, output) {
  if (aggConfig.params[this.name] && aggConfig.params[this.name].length) {
    output.params[this.name] = aggConfig.params[this.name];
  }
};

export { StringParamType };
