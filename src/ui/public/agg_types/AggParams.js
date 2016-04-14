define(function (require) {
  return function AggParamsFactory(Private) {
    require('ui/filters/label');

    let _ = require('lodash');
    let IndexedArray = require('ui/IndexedArray');

    let paramTypeMap = {
      field: Private(require('ui/agg_types/param_types/field')),
      optioned: Private(require('ui/agg_types/param_types/optioned')),
      regex: Private(require('ui/agg_types/param_types/regex')),
      string: Private(require('ui/agg_types/param_types/string')),
      json: Private(require('ui/agg_types/param_types/raw_json')),
      _default: Private(require('ui/agg_types/param_types/base'))
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
          let type = config.name === 'field' ? config.name : config.type;
          let Class = paramTypeMap[type] || paramTypeMap._default;
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
      let output = { params: {} };
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
  };
});
