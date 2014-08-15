define(function (require) {
  return function AggConfigFactory(Private) {
    var _ = require('lodash');
    var aggTypes = Private(require('components/agg_types/index'));

    function AggConfig(vis, opts) {
      var self = this;

      self.id = _.uniqueId('_agg_');
      self.vis = vis;
      self._opts = opts = (opts || {});
      self.type = opts.type;

      if (_.isString(self.type)) {
        self.type = aggTypes.byName[self.type];
      }

      self.params = _.mapValues(opts.params || {}, function (val, name) {
        var aggParam = self.type.params.byName[name];

        if (aggParam.deserialize) {
          return aggParam.deserialize(val, self);
        } else {
          return val;
        }
      });

      self.schema = opts.schema;
      if (_.isString(self.schema)) {
        self.schema = self.vis.type.schemas.all.byName[self.schema];
      }
    }

    AggConfig.prototype.validate = function () {
      if (!this.type) {
        return ['AggConfigs should have a type.'];
      }

      var typeErrors = this.type.validate(this);
      if (typeErrors) return typeErrors;
    };

    AggConfig.prototype.isValid = function () {
      return !this.validate();
    };

    AggConfig.prototype.toJSON = function () {
      var self = this;
      var params = self.params;

      if (!self.isValid()) return;

      var outParams = _.transform(self.type.params, function (outParams, aggParam) {
        var val = params[aggParam.name];

        if (val == null) return;

        if (aggParam.serialize) {
          outParams[aggParam.name] = aggParam.serialize(val, self);
        } else {
          outParams[aggParam.name] = val;
        }
      }, {});

      return {
        type: self.type.name,
        schema: self.schema.name,
        params: outParams
      };
    };

    return AggConfig;
  };
});