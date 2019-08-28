/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { sortBy } from 'lodash';
import { SavedObjectNotFound } from '../../errors';
import { FieldParamEditor } from '../controls/field';
import { BaseParamType } from './base';
import { IndexedArray } from '../../indexed_array';
import { toastNotifications } from '../../notify';
import { createLegacyClass } from '../../utils/legacy_class';
import { propFilter } from '../filter';
import { i18n } from '@kbn/i18n';

const filterByType = propFilter('type');

export function FieldParamType(config) {
  FieldParamType.Super.call(this, config);
}

createLegacyClass(FieldParamType).inherits(BaseParamType);

FieldParamType.prototype.editorComponent = FieldParamEditor;
FieldParamType.prototype.required = true;
FieldParamType.prototype.scriptable = true;
FieldParamType.prototype.filterFieldTypes = '*';
// retain only the fields with the aggregatable property if the onlyAggregatable option is true
FieldParamType.prototype.onlyAggregatable = true;

/**
 * Called to serialize values for saving an aggConfig object
 *
 * @param  {field} field - the field that was selected
 * @return {string}
 */
FieldParamType.prototype.serialize = function (field) {
  return field.name;
};

/**
 * Called to read values from a database record into the
 * aggConfig object
 *
 * @param  {string} fieldName
 * @return {field}
 */
FieldParamType.prototype.deserialize = function (fieldName, aggConfig) {
  const field = aggConfig.getIndexPattern().fields.byName[fieldName];

  if (!field) {
    throw new SavedObjectNotFound('index-pattern-field', fieldName);
  }

  const validField = this.getAvailableFields(aggConfig.getIndexPattern().fields).byName[fieldName];
  if (!validField) {
    toastNotifications.addDanger(
      i18n.translate('common.ui.aggTypes.paramTypes.field.invalidSavedFieldParameterErrorMessage', {
        defaultMessage: 'Saved {fieldParameter} parameter is now invalid. Please select a new field.',
        values: {
          fieldParameter: '"field"'
        }
      })
    );
  }

  return validField;
};

/**
 * filter the fields to the available ones
 */
FieldParamType.prototype.getAvailableFields = function (fields) {
  const filteredFields = fields.filter(field => {
    const { onlyAggregatable, scriptable, filterFieldTypes } = this;

    if ((onlyAggregatable && !field.aggregatable) || (!scriptable && field.scripted)) {
      return false;
    }

    if (!filterFieldTypes) {
      return true;
    }

    return filterByType([field], filterFieldTypes).length !== 0;
  });

  return new IndexedArray({
    index: ['name'],
    group: ['type'],
    initialSet: sortBy(filteredFields, ['type', 'name']),
  });
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
FieldParamType.prototype.write = function (aggConfig, output) {
  const field = aggConfig.getField();

  if (!field) {
    throw new TypeError(
      i18n.translate('common.ui.aggTypes.paramTypes.field.requiredFieldParameterErrorMessage', {
        defaultMessage: '{fieldParameter} is a required parameter',
        values: {
          fieldParameter: '"field"'
        }
      })
    );
  }

  if (field.scripted) {
    output.params.script = {
      source: field.script,
      lang: field.lang,
    };
  } else {
    output.params.field = field.name;
  }
};
