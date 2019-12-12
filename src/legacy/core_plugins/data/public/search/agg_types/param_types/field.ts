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

// @ts-ignore
import { i18n } from '@kbn/i18n';
import { AggConfig } from 'ui/vis';
import { toastNotifications } from 'ui/notify';
import { FieldParamEditor } from 'ui/vis/editors/default/controls/field';
import { SavedObjectNotFound } from '../../../../../../../plugins/kibana_utils/public';
import { BaseParamType } from './base';
import { propFilter } from '../filter';
import { Field, IFieldList } from '../../../../../../../plugins/data/public';

const filterByType = propFilter('type');

export class FieldParamType extends BaseParamType {
  editorComponent = FieldParamEditor;
  required = true;
  scriptable = true;
  filterFieldTypes: string;
  onlyAggregatable: boolean;

  constructor(config: Record<string, any>) {
    super(config);

    this.filterFieldTypes = config.filterFieldTypes || '*';
    this.onlyAggregatable = config.onlyAggregatable !== false;

    if (!config.write) {
      this.write = (aggConfig: AggConfig, output: Record<string, any>) => {
        const field = aggConfig.getField();

        if (!field) {
          throw new TypeError(
            i18n.translate(
              'common.ui.aggTypes.paramTypes.field.requiredFieldParameterErrorMessage',
              {
                defaultMessage: '{fieldParameter} is a required parameter',
                values: {
                  fieldParameter: '"field"',
                },
              }
            )
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
    }

    this.serialize = (field: Field) => {
      return field.name;
    };

    this.deserialize = (fieldName: string, aggConfig?: AggConfig) => {
      if (!aggConfig) {
        throw new Error('aggConfig was not provided to FieldParamType deserialize function');
      }
      const field = aggConfig.getIndexPattern().fields.getByName(fieldName);

      if (!field) {
        throw new SavedObjectNotFound('index-pattern-field', fieldName);
      }

      // @ts-ignore
      const validField = this.getAvailableFields(aggConfig.getIndexPattern().fields).find(
        (f: any) => f.name === fieldName
      );
      if (!validField) {
        toastNotifications.addDanger(
          i18n.translate(
            'common.ui.aggTypes.paramTypes.field.invalidSavedFieldParameterErrorMessage',
            {
              defaultMessage:
                'Saved {fieldParameter} parameter is now invalid. Please select a new field.',
              values: {
                fieldParameter: '"field"',
              },
            }
          )
        );
      }

      return validField;
    };
  }

  /**
   * filter the fields to the available ones
   */
  getAvailableFields = (fields: IFieldList) => {
    const filteredFields = fields.filter((field: Field) => {
      const { onlyAggregatable, scriptable, filterFieldTypes } = this;

      if ((onlyAggregatable && !field.aggregatable) || (!scriptable && field.scripted)) {
        return false;
      }

      if (!filterFieldTypes) {
        return true;
      }

      return filterByType([field], filterFieldTypes).length !== 0;
    });

    return filteredFields;
  };
}
