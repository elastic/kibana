define(function (require) {
  return function AggTypeFactory(Private) {
    var _ = require('lodash');
    var AggParams = Private(require('components/agg_types/_agg_params'));

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
       * the unique, unchanging, name that elasticsearch has assigned this aggType
       *
       * @property name
       * @type {string}
       */
      this.name = config.name;

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
      var params = this.params = config.params || [];
      if (!(params instanceof AggParams)) {
        params = this.params = new AggParams(params);
      }
    }

    return AggType;
  };
});
