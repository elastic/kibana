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
      self.fillDefaults(opts.params);
    }

    /**
     * Write the current values to this.params, filling in the defaults as we go
     *
     * @param  {object} [from] - optional object to read values from,
     *                         used when initializing
     * @return {undefined}
     */
    AggConfig.prototype.fillDefaults = function (from) {
      var self = this;
      from = from || self.params || {};
      var to = self.params = {};

      self.getAggParams().forEach(function (aggParam) {
        var val = from[aggParam.name];

        if (val == null) {
          if (aggParam.default == null) return;
          else val = aggParam.default;
        }

        if (aggParam.deserialize) {
          if (!_.isObject(val)) {
            // only deserialize if we have a scalar value
            val = aggParam.deserialize(val, self);
          }

          to[aggParam.name] = val;
          return;
        }

        to[aggParam.name] = _.cloneDeep(val);
      });
    };

    AggConfig.prototype.toJSON = function () {
      var self = this;
      var params = self.params;

      var outParams = _.transform(self.getAggParams(), function (out, aggParam) {
        var val = params[aggParam.name];

        // don't serialize undefined/null values
        if (val == null) return;

        if (aggParam.serialize) val = aggParam.serialize(val, self);

        // to prevent accidental leaking, we will clone all complex values
        out[aggParam.name] = _.cloneDeep(val);
      }, {});

      return {
        type: self.type && self.type.name,
        schema: self.schema && self.schema.name,
        params: outParams
      };
    };

    AggConfig.prototype.getAggParams = function () {
      return [].concat(
        (this.type) ? this.type.params.raw : [],
        (this.schema) ? this.schema.params.raw : []
      );
    };

    return AggConfig;
  };
});