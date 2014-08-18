define(function (require) {
  return function AggParamsFactory(Private) {
    var _ = require('lodash');
    var Registry = require('utils/registry');

    var BaseAggParam = Private(require('components/agg_types/param_types/base'));
    var FieldAggParam = Private(require('components/agg_types/param_types/field'));
    var OptionedAggParam = Private(require('components/agg_types/param_types/optioned'));

    _(AggParams).inherits(Registry);
    function AggParams(params) {
      AggParams.Super.call(this, {
        index: ['name'],
        group: ['required'],
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