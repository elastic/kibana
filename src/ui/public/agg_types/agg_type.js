import _ from 'lodash';
import AggTypesAggParamsProvider from 'ui/agg_types/agg_params';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
export default function AggTypeFactory(Private) {
  const AggParams = Private(AggTypesAggParamsProvider);
  const fieldFormats = Private(RegistryFieldFormatsProvider);

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
      // always append custom label

      if (config.customLabels !== false) {
        this.params.push({
          name: 'customLabel',
          type: 'string',
          write: _.noop
        });
      }

      this.params = new AggParams(this.params);
    }

    /**
     * Designed for multi-value metric aggs, this method can return a
     * set of AggConfigs that should replace this aggConfig in requests
     *
     * @method getRequestAggs
     * @returns {array[AggConfig]|undefined} - an array of aggConfig objects
     *                                         that should replace this one,
     *                                         or undefined
     */
    this.getRequestAggs = config.getRequestAggs || _.noop;

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
    this.decorateAggConfig = config.decorateAggConfig || null;

    if (config.getFormat) {
      this.getFormat = config.getFormat;
    }
  }

  /**
   * Pick a format for the values produced by this agg type,
   * overriden by several metrics that always output a simple
   * number
   *
   * @param  {agg} agg - the agg to pick a format for
   * @return {FieldFromat}
   */
  AggType.prototype.getFormat = function (agg) {
    const field = agg.getField();
    return field ? field.format : fieldFormats.getDefaultInstance('string');
  };

  return AggType;
}
