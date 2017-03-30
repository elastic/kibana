import 'ui/filters/label';
import _ from 'lodash';
import IndexedArray from 'ui/indexed_array';
import AggTypesParamTypesFieldProvider from 'ui/agg_types/param_types/field';
import AggTypesParamTypesOptionedProvider from 'ui/agg_types/param_types/optioned';
import AggTypesParamTypesRegexProvider from 'ui/agg_types/param_types/regex';
import AggTypesParamTypesStringProvider from 'ui/agg_types/param_types/string';
import AggTypesParamTypesRawJsonProvider from 'ui/agg_types/param_types/raw_json';
import AggTypesParamTypesBaseProvider from 'ui/agg_types/param_types/base';
export default function AggParamsFactory(Private) {
  const paramTypeMap = {
    field: Private(AggTypesParamTypesFieldProvider),
    optioned: Private(AggTypesParamTypesOptionedProvider),
    regex: Private(AggTypesParamTypesRegexProvider),
    string: Private(AggTypesParamTypesStringProvider),
    json: Private(AggTypesParamTypesRawJsonProvider),
    _default: Private(AggTypesParamTypesBaseProvider)
  };

  /**
   * Wraps a list of {{#crossLink "AggParam"}}{{/crossLink}} objects; owned by an {{#crossLink "AggType"}}{{/crossLink}}
   *
   * used to create:
   *   - `FieldAggParam` – When the config has `name: "field"`
   *   - `*AggParam` – When the type matches something in the map above
   *   - `BaseAggParam` – All other params
   *
   * @class AggParams
   * @constructor
   * @extends IndexedArray
   * @param {object[]} params - array of params that get new-ed up as AggParam objects as descibed above
   */
  _.class(AggParams).inherits(IndexedArray);
  function AggParams(params) {
    AggParams.Super.call(this, {
      index: ['name'],
      initialSet: params.map(function (config) {
        const type = config.name === 'field' ? config.name : config.type;
        const Class = paramTypeMap[type] || paramTypeMap._default;
        return new Class(config);
      })
    });
  }

  /**
   * Reads an aggConfigs
   *
   * @method write
   * @param  {AggConfig} aggConfig
   *         the AggConfig object who's type owns these aggParams and contains the param values for our param defs
   * @param  {object} [locals]
   *         an array of locals that will be available to the write function (can be used to enhance
   *         the quality of things like date_histogram's "auto" interval)
   * @return {object} output
   *         output of the write calls, reduced into a single object. A `params: {}` property is exposed on the
   *         output object which is used to create the agg dsl for the search request. All other properties
   *         are dependent on the AggParam#write methods which should be studied for each AggType.
   */
  AggParams.prototype.write = function (aggConfig, locals) {
    const output = { params: {} };
    locals = locals || {};

    this.forEach(function (param) {
      if (param.write) {
        param.write(aggConfig, output, locals);
      } else {
        output.params[param.name] = aggConfig.params[param.name];
      }
    });

    return output;
  };

  return AggParams;
}
