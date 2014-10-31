define(function (require) {
  return function AggParamsFactory(Private) {
    require('filters/label');
    var _ = require('lodash');
    var IndexedArray = require('utils/indexed_array/index');

    var BaseAggParam = Private(require('components/agg_types/param_types/base'));
    var FieldAggParam = Private(require('components/agg_types/param_types/field'));
    var OptionedAggParam = Private(require('components/agg_types/param_types/optioned'));
    var RegexAggParam = Private(require('components/agg_types/param_types/regex'));
    var StringAggParam = Private(require('components/agg_types/param_types/string'));
    var RawJSONAggParam = Private(require('components/agg_types/param_types/raw_json'));

    /**
     * Wraps a list of {{#crossLink "AggParam"}}{{/crossLink}} objects; owned by an {{#crossLink "AggType"}}{{/crossLink}}
     *
     * used to create:
     *   - `OptionedAggParam` – When the config has an array of `options: []`
     *   - `FieldAggParam` – When the config has `name: "field"`
     *   - `BaseAggParam` – All other params
     *
     * @class AggParams
     * @constructor
     * @extends IndexedArray
     * @param {object[]} params - array of params that get new-ed up as AggParam objects as descibed above
     */
    _(AggParams).inherits(IndexedArray);
    function AggParams(params) {
      if (_.isPlainObject(params)) {
        // convert the names: details format into details[].name
        params = _.map(params, function (param, name) {
          param.name = name;
          return param;
        });
      }

      // always append the raw JSON param
      params.push({
        name: 'json',
        type: 'json',
        advanced: true
      });

      AggParams.Super.call(this, {
        index: ['name'],
        initialSet: params.map(function (param) {
          if (param.name === 'field') {
            return new FieldAggParam(param);
          }
          else if (param.type === 'optioned') {
            return new OptionedAggParam(param);
          }
          else if (param.type === 'regex') {
            return new RegexAggParam(param);
          }
          else if (param.type === 'string') {
            return new StringAggParam(param);
          }
          else if (param.type === 'json') {
            return new RawJSONAggParam(param);
          }
          else {
            return new BaseAggParam(param);
          }
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
      var output = { params: {} };
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
