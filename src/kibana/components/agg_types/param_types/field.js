define(function (require) {
  return function FieldAggParamFactory(Private) {
    var _ = require('lodash');

    var editorHtml = require('text!components/agg_types/controls/field.html');
    var BaseAggParam = Private(require('components/agg_types/param_types/base'));

    _(FieldAggParam).inherits(BaseAggParam);
    function FieldAggParam(config) {
      FieldAggParam.Super.call(this, config);
    }

    FieldAggParam.prototype.editor = editorHtml;
    FieldAggParam.prototype.filterFieldTypes = '*';


    /**
     * Called to serialize values for saving an aggConfig object
     *
     * @param  {field} field - the field that was selected
     * @return {string}
     */
    FieldAggParam.prototype.serialize = function (field) {
      return field.name;
    };

    /**
     * Called to read values from a database record into the
     * aggConfig object
     *
     * @param  {string} fieldName
     * @return {field}
     */
    FieldAggParam.prototype.deserialize = function (fieldName, aggConfig) {
      return aggConfig.vis.indexPattern.fields.byName[fieldName];
    };

    /**
     * Write the aggregation parameter.
     *
     * @param  {AggConfig} aggConfig - the entire configuration for this agg
     * @param  {object} output - the result of calling write on all of the aggregations
     *                         parameters.
     * @param  {object} output.params - the final object that will be included as the params
     *                               for the agg
     * @return {undefined}
     */
    FieldAggParam.prototype.write = function (aggConfig, output) {
      output.params.field = aggConfig.params.field.name;
    };

    return FieldAggParam;
  };
});