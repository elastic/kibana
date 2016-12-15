import { SavedObjectNotFound } from 'ui/errors';
import _ from 'lodash';
import editorHtml from 'ui/agg_types/controls/field.html';
import AggTypesParamTypesBaseProvider from 'ui/agg_types/param_types/base';
import 'ui/filters/field_type';
import IndexedArray from 'ui/indexed_array';
import Notifier from 'ui/notify/notifier';

export default function FieldAggParamFactory(Private, $filter) {
  const BaseAggParam = Private(AggTypesParamTypesBaseProvider);
  const notifier = new Notifier();

  _.class(FieldAggParam).inherits(BaseAggParam);
  function FieldAggParam(config) {
    FieldAggParam.Super.call(this, config);
  }

  FieldAggParam.prototype.editor = editorHtml;
  FieldAggParam.prototype.scriptable = true;
  FieldAggParam.prototype.filterFieldTypes = '*';
  // retain only the fields with the aggregatable property if the onlyAggregatable option is true
  FieldAggParam.prototype.onlyAggregatable = true;
  // show a warning about the field being analyzed
  FieldAggParam.prototype.showAnalyzedWarning = true;

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
   * Get the options for this field from the indexPattern
   */
  FieldAggParam.prototype.getFieldOptions = function (aggConfig) {
    const indexPattern = aggConfig.getIndexPattern();
    let fields = indexPattern.fields.raw;

    if (this.onlyAggregatable) {
      fields = fields.filter(f => f.aggregatable);
    }

    if (!this.scriptable) {
      fields = fields.filter(field => !field.scripted);
    }

    if (this.filterFieldTypes) {
      let filters = this.filterFieldTypes;
      if (_.isFunction(this.filterFieldTypes)) {
        filters = this.filterFieldTypes.bind(this, aggConfig.vis);
      }
      fields = $filter('fieldType')(fields, filters);
      fields = $filter('orderBy')(fields, ['type', 'name']);
    }


    return new IndexedArray({
      index: ['name'],
      group: ['type'],
      initialSet: fields
    });
  };

  /**
   * Called to read values from a database record into the
   * aggConfig object
   *
   * @param  {string} fieldName
   * @return {field}
   */
  FieldAggParam.prototype.deserialize = function (fieldName, aggConfig) {
    const field = aggConfig.getIndexPattern().fields.byName[fieldName];

    if (!field) {
      throw new SavedObjectNotFound('index-pattern-field', fieldName);
    }

    const validField = this.getFieldOptions(aggConfig).byName[fieldName];
    if (!validField) {
      notifier.error(`Saved "field" parameter is now invalid. Please select a new field.`);
    }

    return validField;
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
    const field = aggConfig.getField();

    if (!field) {
      throw new TypeError('"field" is a required parameter');
    }

    if (field.scripted) {
      output.params.script = {
        inline: field.script,
        lang: field.lang,
      };
    } else {
      output.params.field = field.name;
    }
  };

  return FieldAggParam;
}
