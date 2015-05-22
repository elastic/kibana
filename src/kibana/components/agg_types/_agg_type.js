define(function (require) {
  return function AggTypeFactory(Private) {
    var _ = require('lodash');
    var AggParams = Private(require('components/agg_types/_agg_params'));
    var fieldFormats = Private(require('registry/field_formats'));

    /**
     * Generic AggType Constructor
     *
     * Used to create the values exposed by the agg_types module.
     *
     * @class AggType
     * @private
     * @param {object} config - used to set the properties of the AggType
     */
    function AggType(config) {

      /**
       * the unique, unchanging, name that we have assigned this aggType
       *
       * @property name
       * @type {string}
       */
      this.name = config.name;

      /**
       * the name of the elasticsearch aggregation that this aggType represents. Usually just this.name
       *
       * @property name
       * @type {string}
       */
      this.dslName = config.dslName || config.name;

      /**
       * the user friendly name that will be shown in the ui for this aggType
       *
       * @property title
       * @type {string}
       */
      this.title = config.title;

      /**
       * a function that will be called when this aggType is assigned to
       * an aggConfig, and that aggConfig is being rendered (in a form, chart, etc.).
       *
       * @method makeLabel
       * @param {AggConfig} aggConfig - an agg config of this type
       * @returns {string} - label that can be used in the ui to descripe the aggConfig
       */
      this.makeLabel = config.makeLabel || _.constant(this.name);

      /**
       * Describes if this aggType creates data that is ordered, and if that ordered data
       * is some sort of time series.
       *
       * If the aggType does not create ordered data, set this to something "falsey".
       *
       * If this does create orderedData, then the value should be an object.
       *
       * If the orderdata is some sort of time series, `this.ordered` should be an object
       * with the property `date: true`
       *
       * @property ordered
       * @type {object|undefined}
       */
      this.ordered = config.ordered;

      /**
       * Flag that prevents this aggregation from being included in the dsl. This is only
       * used by the count aggregation (currently) since it doesn't really exist and it's output
       * is available on every bucket.
       *
       * @type {Boolean}
       */
      this.hasNoDsl = !!config.hasNoDsl;

      /**
       * The method to create a filter representation of the bucket
       * @param {object} aggConfig The instance of the aggConfig
       * @param {mixed} key The key for the bucket
       * @returns {object} The filter
       */
      this.createFilter = config.createFilter;

      /**
       * An instance of {{#crossLink "AggParams"}}{{/crossLink}}.
       *
       * @property params
       * @type {AggParams}
       */
      this.params = config.params || [];
      if (!(this.params instanceof AggParams)) {
        // always append the raw JSON param
        this.params.push({
          name: 'json',
          type: 'json',
          advanced: true
        });

        this.params = new AggParams(this.params);
      }

      /**
       * Designed for multi-value metric aggs, this method can return a
       * set of AggConfigs that should replace this aggConfig in result sets
       * that walk the AggConfig set.
       *
       * @method getResponseAggs
       * @returns {array[AggConfig]|undefined} - an array of aggConfig objects
       *                                         that should replace this one,
       *                                         or undefined
       */
      this.getResponseAggs = config.getResponseAggs || _.noop;

      /**
       * A function that will be called each time an aggConfig of this type
       * is created, giving the agg type a chance to modify the agg config
       */
      this.getAggConfigDecorations = config.aggConfigDecoratations || _.noop;

      if (config.getFormat) {
        this.getFormat = config.getFormat;
      }
    }

    /**
     * Apply the decorations provided by the config's decorateAggConfig function
     *
     * @param  {AggConfig} agg - the aggConfig object to decorate
     * @return {function} - a function that will remove the decorations when called
     */
    AggType.prototype.decorateAggConfig = function (agg) {
      var typeDescriptors = this.getAggConfigDecorations(agg);

      if (!typeDescriptors) return _.noop;

      // the keys that a type descriptor might have, according the ES5 spec
      var typeDescriptorKeys = ['configurable', 'enumerable', 'value', 'writable', 'get', 'set'];
      function throwTypeDescriptorError() {
        throw new TypeError(
          'agg decorations must be a set of type descriptors in the same format ' +
          'as the second argument to Object::defineProperties(). See https://goo.gl/YzVlzs'
        );
      }

      // verify type descriptors are in the right
      // format and are configurable
      if (!_.isPlainObject(typeDescriptors)) throwTypeDescriptorError();

      _.forOwn(typeDescriptors, function (prop, desc) {
        if (!_.isPlainObject(desc)) throwTypeDescriptorError();

        var badKeys = _.difference(_.keys(desc), typeDescriptorKeys);
        if (badKeys.length) {
          var msg = 'invalid type descriptor key' + (badKeys.length === 1 ? '' : 's');
          throw new TypeError(msg + ': ' + badKeys.join(', '));
        }

        desc.configurable = true; // ensure that the descriptor can be removed later
      }, {});

      Object.defineProperties(agg, typeDescriptors);

      return function () {
        _.forOwn(typeDescriptors, function (prop) {
          delete agg[prop];
        });
      };
    };

    /**
     * Pick a format for the values produced by this agg type,
     * overriden by several metrics that always output a simple
     * number
     *
     * @param  {agg} agg - the agg to pick a format for
     * @return {FieldFromat}
     */
    AggType.prototype.getFormat = function (agg) {
      var field = agg.field();
      return field ? field.format : fieldFormats.getDefaultInstance('string');
    };

    return AggType;
  };
});
