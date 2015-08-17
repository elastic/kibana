define(function (require) {
  return function AggConfigFactory(Private, fieldTypeFilter) {
    var _ = require('lodash');
    var fieldFormats = Private(require('ui/registry/field_formats'));

    function AggConfig(vis, opts) {
      var self = this;

      self.id = String(opts.id || AggConfig.nextId(vis.aggs));
      self.vis = vis;
      self._opts = opts = (opts || {});

      // setters
      self.type = opts.type;
      self.schema = opts.schema;

      // resolve the params
      self.fillDefaults(opts.params);
    }

    /**
     * Ensure that all of the objects in the list have ids, the objects
     * and list are modified by reference.
     *
     * @param  {array[object]} list - a list of objects, objects can be anything really
     * @return {array} - the list that was passed in
     */
    AggConfig.ensureIds = function (list) {
      var have = [];
      var haveNot = [];
      list.forEach(function (obj) {
        (obj.id ? have : haveNot).push(obj);
      });

      var nextId = AggConfig.nextId(have);
      haveNot.forEach(function (obj) {
        obj.id = String(nextId++);
      });

      return list;
    };

    /**
     * Calculate the next id based on the ids in this list
     *
     * @return {array} list - a list of objects with id properties
     */
    AggConfig.nextId = function (list) {
      return 1 + list.reduce(function (max, obj) {
        return Math.max(max, +obj.id || 0);
      }, 0);
    };

    Object.defineProperties(AggConfig.prototype, {
      type: {
        get: function () {
          return this.__type;
        },
        set: function (type) {
          if (this.__typeDecorations) {
            _.forOwn(this.__typeDecorations, function (prop, name) {
              delete this[name];
            }, this);
          }

          if (_.isString(type)) {
            type = AggConfig.aggTypes.byName[type];
          }

          if (type && _.isFunction(type.decorateAggConfig)) {
            this.__typeDecorations = type.decorateAggConfig();
            Object.defineProperties(this, this.__typeDecorations);
          }

          this.__type = type;
        }
      },
      schema: {
        get: function () {
          return this.__schema;
        },
        set: function (schema) {
          if (_.isString(schema)) {
            schema = this.vis.type.schemas.all.byName[schema];
          }

          this.__schema = schema;
        }
      }
    });

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

          if (!_.isFunction(aggParam.default)) {
            val = aggParam.default;
          } else {
            val = aggParam.default(self);
            if (val == null) return;
          }
        }

        if (aggParam.deserialize) {
          var isTyped = _.isFunction(aggParam.type);

          var isType = isTyped && (val instanceof aggParam.type);
          var isObject = !isTyped && _.isObject(val);
          var isDeserialized = (isType || isObject);

          if (!isDeserialized) {
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
      var fieldParam = this.type && this.type.params.byName.field;
      var field;

      if (fieldParam) {
        var prevField = this.params.field;
        var fieldOpts = fieldTypeFilter(this.vis.indexPattern.fields, fieldParam.filterFieldTypes);
        field = _.contains(fieldOpts, prevField) ? prevField : null;
      }

      return this.fillDefaults({ row: this.params.row, field: field });
    };

    AggConfig.prototype.write = function () {
      return this.type.params.write(this);
    };

    AggConfig.prototype.createFilter = function (key) {
      if (!_.isFunction(this.type.createFilter)) {
        throw new TypeError('The "' + this.type.title + '" aggregation does not support filtering.');
      }

      var field = this.field();
      var label = this.fieldDisplayName();
      if (field && !field.filterable) {
        var message = 'The "' + label + '" field can not be used for filtering.';
        if (field.scripted) {
          message = 'The "' + label + '" field is scripted and can not be used for filtering.';
        }
        throw new TypeError(message);
      }

      return this.type.createFilter(this, key);
    };

    /**
     * Hook into param onRequest handling, and tell the aggConfig that it
     * is being sent to elasticsearc.
     *
     * @return {[type]} [description]
     */
    AggConfig.prototype.requesting = function () {
      var self = this;
      self.type && self.type.params.forEach(function (param) {
        if (param.onRequest) param.onRequest(self);
      });
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
      configDsl[this.type.dslName || this.type.name] = output.params;

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
        if (val == null) return;

        // to prevent accidental leaking, we will clone all complex values
        out[aggParam.name] = _.cloneDeep(val);
      }, {});

      return {
        id: self.id,
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

    AggConfig.prototype.getResponseAggs = function () {
      if (!this.type) return;
      return this.type.getResponseAggs(this) || [this];
    };

    AggConfig.prototype.getValue = function (bucket) {
      return this.type.getValue(this, bucket);
    };

    AggConfig.prototype.getKey = function (bucket, key) {
      return this.type.getKey(bucket, key, this);
    };

    AggConfig.prototype.makeLabel = function () {
      if (!this.type) return '';
      return this.type.makeLabel(this);
    };

    AggConfig.prototype.field = function () {
      return this.params.field;
    };

    AggConfig.prototype.fieldFormatter = function (contentType, defaultFormat) {
      var format = this.type && this.type.getFormat(this);
      if (format) return format.getConverterFor(contentType);
      return this.fieldOwnFormatter(contentType, defaultFormat);
    };

    AggConfig.prototype.fieldOwnFormatter = function (contentType, defaultFormat) {
      var field = this.field();
      var format = field && field.format;
      if (!format) format = defaultFormat;
      if (!format) format = fieldFormats.getDefaultInstance('string');
      return format.getConverterFor(contentType);
    };

    AggConfig.prototype.fieldName = function () {
      var field = this.field();
      return field ? field.name : '';
    };

    AggConfig.prototype.fieldDisplayName = function () {
      var field = this.field();
      return field ? (field.displayName || this.fieldName()) : '';
    };

    AggConfig.prototype.fieldIsTimeField = function () {
      var timeFieldName = this.vis.indexPattern.timeFieldName;
      return timeFieldName && this.fieldName() === timeFieldName;
    };

    return AggConfig;
  };
});
