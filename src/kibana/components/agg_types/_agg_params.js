define(function (require) {
  return function AggParamsFactory(Private) {
    var _ = require('lodash');
    var Registry = require('utils/registry/registry');

    var BaseAggParam = Private(require('components/agg_types/param_types/base'));
    var FieldAggParam = Private(require('components/agg_types/param_types/field'));
    var OptionedAggParam = Private(require('components/agg_types/param_types/optioned'));

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
     * @extends Registry
     * @param {object[]} params - array of params that get new-ed up as AggParam objects as descibed above
     */
    _(AggParams).inherits(Registry);
    function AggParams(params) {
      if (_.isPlainObject(params)) {
        // convert the names: details format into details[].name
        params = _.map(params, function (param, name) {
          param.name = name;
          return param;
        });
      }

      AggParams.Super.call(this, {
        index: ['name'],
        initialSet: params.map(function (param) {
          if (param.name === 'field') {
            return new FieldAggParam(param);
          }
          else if (param.options) {
            return new OptionedAggParam(param);
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
