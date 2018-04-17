import _ from 'lodash';
import editorHtml from '../controls/raw_json.html';
import { BaseParamType } from './base';
import { createLegacyClass } from '../../utils/legacy_class';


createLegacyClass(JsonParamType).inherits(BaseParamType);
function JsonParamType(config) {
  // force name override
  config = _.defaults(config, { name: 'json' });
  JsonParamType.Super.call(this, config);
}

JsonParamType.prototype.editor = editorHtml;

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
JsonParamType.prototype.write = function (aggConfig, output) {
  let paramJson;
  const param = aggConfig.params[this.name];

  if (!param) {
    return;
  }

  // handle invalid Json input
  try {
    paramJson = JSON.parse(param);
  } catch (err) {
    return;
  }

  function filteredCombine(srcA, srcB) {
    function mergeObjs(a, b) {
      return _(a)
        .keys()
        .union(_.keys(b))
        .transform(function (dest, key) {
          const val = compare(a[key], b[key]);
          if (val !== undefined) dest[key] = val;
        }, {})
        .value();
    }

    function mergeArrays(a, b) {
      // attempt to merge each value
      return _.times(Math.max(a.length, b.length), function (i) {
        return compare(a[i], b[i]);
      });
    }

    function compare(a, b) {
      if (_.isPlainObject(a) && _.isPlainObject(b)) return mergeObjs(a, b);
      if (Array.isArray(a) && Array.isArray(b)) return mergeArrays(a, b);
      if (b === null) return undefined;
      if (b !== undefined) return b;
      return a;
    }

    return compare(srcA, srcB);
  }

  output.params = filteredCombine(output.params, paramJson);
  return;
};

export { JsonParamType };
