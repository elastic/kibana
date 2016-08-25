import _ from 'lodash';
import editorHtml from 'ui/agg_types/controls/raw_json.html';
import AggTypesParamTypesBaseProvider from 'ui/agg_types/param_types/base';
export default function RawJSONAggParamFactory(Private) {

  const BaseAggParam = Private(AggTypesParamTypesBaseProvider);

  _.class(RawJSONAggParam).inherits(BaseAggParam);
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
    let paramJSON;
    const param = aggConfig.params[this.name];

    if (!param) {
      return;
    }

    // handle invalid JSON input
    try {
      paramJSON = JSON.parse(param);
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
        if (_.isArray(a) && _.isArray(b)) return mergeArrays(a, b);
        if (b === null) return undefined;
        if (b !== undefined) return b;
        return a;
      }

      return compare(srcA, srcB);
    }

    output.params = filteredCombine(output.params, paramJSON);
    return;
  };

  return RawJSONAggParam;
}
