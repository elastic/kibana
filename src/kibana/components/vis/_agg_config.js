define(function (require) {
  return function AggConfigFactory(Private) {
    var _ = require('lodash');
    var aggTypes = Private(require('components/agg_types/index'));

    function AggConfig(vis, opts) {
      var self = this;

      self.id = _.uniqueId('agg_');
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

    /**
     * Clear the parameters for this aggConfig
     *
     * @return {object} the new params object
     */
    AggConfig.prototype.resetParams = function () {
      return this.fillDefaults({});
    };

    AggConfig.prototype.write = function () {
      return this.type.params.write(this);
    };

    /**
     * Convert this aggConfig to it's dsl syntax.
     *
     * Adds params and adhoc subaggs to a pojo, then returns it
     *
     * @param  {AggConfig} aggConfig - the config object to convert
     * @return {void|Object} - if the config has a dsl representation, it is
     *                         returned, else undefined is returned
     */
    AggConfig.prototype.toDsl = function () {
      if (this.type.hasNoDsl) return;

      var output = this.write();

      var configDsl = {};
      configDsl[this.type.name] = output.params;

      // if the config requires subAggs, write them to the dsl as well
      if (output.subAggs) {
        var subDslLvl = configDsl.aggs || (configDsl.aggs = {});
        output.subAggs.forEach(function nestAdhocSubAggs(subAggConfig) {
          subDslLvl[subAggConfig.id] = subAggConfig.toDsl();
        });
      }

      return configDsl;
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

    AggConfig.prototype.makeLabel = function () {
      if (!this.type) return '';
      return this.type.makeLabel(this);
    };

    return AggConfig;
  };
});