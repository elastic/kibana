import { IndexedArray } from '../../indexed_array';
import { BaseParamType } from './base';
import { createLegacyClass } from '../../utils/legacy_class';

createLegacyClass(OptionedParamType).inherits(BaseParamType);
function OptionedParamType(config) {
  OptionedParamType.Super.call(this, config);

  this.options = new IndexedArray({
    index: ['val'],
    immutable: true,
    initialSet: this.options
  });
}

/**
 * Serialize a selection to be stored in the database
 * @param  {object} selected - the option that was selected
 * @return {any}
 */
OptionedParamType.prototype.serialize = function (selected) {
  return selected.val;
};

/**
 * Take a value that was serialized to the database and
 * return the option that is represents
 *
 * @param  {any} val - the value that was saved
 * @return {object}
 */
OptionedParamType.prototype.deserialize = function (val) {
  return this.options.byVal[val];
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
OptionedParamType.prototype.write = function (aggConfig, output) {
  output.params[this.name] = aggConfig.params[this.name].val;
};

export { OptionedParamType };
