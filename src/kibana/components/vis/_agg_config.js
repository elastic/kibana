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
      self.fillDefaults(opts.params);
    }

    /**
     * Write the current values to this.params,
     * filling in the defaults as we go
     *
     * @param  {} from [description]
     * @return {[type]}      [description]
     */
    AggConfig.prototype.fillDefaults = function (from) {
      var self = this;
      from = from || self.params;
      var to = self.params = {};

      self.getParamNames().forEach(function (name) {
        var val = from[name];
        var aggParam = self.getParam(name);
        if (!aggParam) return;

        if (val == null) {
          if (aggParam.default == null) return;
          else val = aggParam.default;
        }

        // only deserialize if we have a scalar value, and a deserialize fn
        if (!_.isObject(val) && aggParam.deserialize) {
          self.params[name] = aggParam.deserialize(val, self);
        } else {
          self.params[name] = val;
        }
      });
    };

    AggConfig.prototype.toJSON = function () {
      var self = this;
      var params = self.params;

      var outParams = _.transform(self.getParamNames(), function (out, name) {
        var val = params[name];
        // don't serialize undefined/null values
        if (val == null) return;

        var aggParam = self.getParam(name);

        if (aggParam.serialize) {
          out[name] = aggParam.serialize(val, self);
          return;
        }

        out[name] = val;
      }, {});

      return {
        type: self.type && self.type.name,
        schema: self.schema && self.schema.name,
        params: outParams
      };
    };

    AggConfig.prototype.getParamNames = function () {
      var keys = [];

      if (this.type) keys.push.apply(keys, _.pluck(this.type.params, 'name'));
      if (this.schema) keys.push.apply(keys, _.pluck(this.schema.params, 'name'));

      return keys;
    };

    AggConfig.prototype.getParam = function (name) {
      var aggParam;

      if (this.type) aggParam = this.type.params.byName[name];
      if (!aggParam && this.schema) aggParam = this.schema.params.byName[name];

      return aggParam;
    };

    return AggConfig;
  };
});