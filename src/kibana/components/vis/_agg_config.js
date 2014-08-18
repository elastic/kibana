define(function (require) {
  return function AggConfigFactory(Private) {
    var _ = require('lodash');
    var aggTypes = Private(require('components/agg_types/index'));

    function AggConfig(vis, opts) {
      var self = this;

      self.id = _.uniqueId('_agg_');
      self.vis = vis;
      self._opts = opts = (opts || {});

      // get the config type
      self.type = opts.type;
      if (_.isString(self.type)) {
        self.type = aggTypes.byName[self.type];
      }

      // get the config schema
      self.schema = opts.schema;
      if (_.isString(self.schema)) {
        self.schema = self.vis.type.schemas.all.byName[self.schema];
      }

      // resolve the params
      self.params = {};

      self.getPossibleParamKeys().forEach(function (name) {
        var val = opts.params[name];

        var aggParam = self.type.params.byName[name] || self.schema.params.byName[name];
        if (!aggParam) return;

        if (val == null) {
          self.params[name] = aggParam.default;
          return;
        }

        if (aggParam.deserialize) {
          self.params[name] = aggParam.deserialize(val, self);
        } else {
          self.params[name] = val;
        }
      }, {});
    }

    AggConfig.prototype.validate = function () {
      if (!this.type) {
        return ['AggConfigs should have a type.'];
      }

      var typeErrors = this.type.validate(this);
      if (typeErrors) return typeErrors;
    };

    AggConfig.prototype.getPossibleParamKeys = function () {
      var keys = [];

      if (this.type) {
        keys.push.apply(keys, _.pluck(this.type.params, 'name'));
      }
      if (this.schema) {
        keys.push.apply(keys, _.pluck(this.schema.params, 'name'));
      }

      return keys;
    };

    AggConfig.prototype.isValid = function () {
      return !this.validate();
    };

    AggConfig.prototype.toJSON = function () {
      var self = this;
      var params = self.params;

      if (!self.isValid()) return;

      var outParams = _.transform(self.getPossibleParamKeys(), function (out, name) {
        var val = params[name];
        // don't serialize undefined/null values
        if (val == null) return;

        var aggParam = self.type.params.byName[name] || self.schema.params.byName[name];

        if (aggParam.serialize) {
          out[name] = aggParam.serialize(val, self);
          return;
        }

        out[name] = val;
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