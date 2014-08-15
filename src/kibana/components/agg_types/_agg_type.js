define(function (require) {
  return function AggTypeFactory(Private) {
    var _ = require('lodash');
    var AggParams = Private(require('components/agg_types/_agg_params'));

    function AggType(config) {
      this.name = config.name;
      this.title = config.title;
      this.makeLabel = config.makeLabel || _.constant(this.name);

      var params = this.params = config.params || [];

      if (!(params instanceof AggParams)) {
        if (_.isPlainObject(params)) {
          // convert the names: details format into details[].name
          params = _.map(params, function (param, name) {
            param.name = name;
            return param;
          });
        }

        params = this.params = new AggParams(params);
      }
    }

    AggType.prototype.validate = function (aggConfig) {
      var self = this;
      var input = aggConfig.params;
      var errors = [];

      self.params.forEach(function (param) {
        var val = input[param.name];

        var required = param.required;
        if (_.isFunction(required)) {
          required = required(self);
        }

        if (val == null) {
          if (param.default != null) {
            val = input[param.name] = param.default;
          } else {
            if (required) {
              errors.push(param.display + ' is required');
            }
            return;
          }
        }

        if (param.options && !_.contains(param.options, val)) {
          if (!param.custom) {
            errors.push(JSON.stringify(val) + ' is not a valid option');
            return;
          }
        }

        if (param.validate) {
          param.validate(aggConfig, errors);
        }
      });

      return errors.length ? errors : void 0;
    };

    return AggType;
  };
});