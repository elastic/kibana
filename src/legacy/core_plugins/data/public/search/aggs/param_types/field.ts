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

import { i18n } from '@kbn/i18n';
import { isFunction } from 'lodash';
import { npStart } from 'ui/new_platform';
import { IAggConfig } from '../agg_config';
import { SavedObjectNotFound } from '../../../../../../../plugins/kibana_utils/public';
import { BaseParamType } from './base';
import { propFilter } from '../filter';
import { IMetricAggConfig } from '../metrics/metric_agg_type';
import {
  IndexPatternField,
  indexPatterns,
  KBN_FIELD_TYPES,
} from '../../../../../../../plugins/data/public';

const filterByType = propFilter('type');

type FieldTypes = KBN_FIELD_TYPES | KBN_FIELD_TYPES[] | '*';
export type FilterFieldTypes = ((aggConfig: IMetricAggConfig) => FieldTypes) | FieldTypes;
// TODO need to make a more explicit interface for this
export type IFieldParamType = FieldParamType;

export class FieldParamType extends BaseParamType {
  required = true;
  scriptable = true;
  filterFieldTypes: FilterFieldTypes;
  onlyAggregatable: boolean;

  constructor(config: Record<string, any>) {
    super(config);

    this.filterFieldTypes = config.filterFieldTypes || '*';
    this.onlyAggregatable = config.onlyAggregatable !== false;

    if (!config.write) {
      this.write = (aggConfig: IAggConfig, output: Record<string, any>) => {
        const field = aggConfig.getField();

        if (!field) {
          throw new TypeError(
            i18n.translate('data.search.aggs.paramTypes.field.requiredFieldParameterErrorMessage', {
              defaultMessage: '{fieldParameter} is a required parameter',
              values: {
                fieldParameter: '"field"',
              },
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
    }

    this.serialize = (field: IndexPatternField) => {
      return field.name;
    };

    this.deserialize = (fieldName: string, aggConfig?: IAggConfig) => {
      if (!aggConfig) {
        throw new Error('aggConfig was not provided to FieldParamType deserialize function');
      }
      const field = aggConfig.getIndexPattern().fields.getByName(fieldName);

      if (!field) {
        throw new SavedObjectNotFound('index-pattern-field', fieldName);
      }

      // @ts-ignore
      const validField = this.getAvailableFields(aggConfig).find((f: any) => f.name === fieldName);
      if (!validField) {
        npStart.core.notifications.toasts.addDanger(
          i18n.translate(
            'data.search.aggs.paramTypes.field.invalidSavedFieldParameterErrorMessage',
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
  getAvailableFields = (aggConfig: IAggConfig) => {
    const fields = aggConfig.getIndexPattern().fields;
    const filteredFields = fields.filter((field: IndexPatternField) => {
      const { onlyAggregatable, scriptable, filterFieldTypes } = this;

      if (
        (onlyAggregatable && (!field.aggregatable || indexPatterns.isNestedField(field))) ||
        (!scriptable && field.scripted)
      ) {
        return false;
      }

      if (isFunction(filterFieldTypes)) {
        const filter = filterFieldTypes(aggConfig as IMetricAggConfig);

        return filterByType([field], filter).length !== 0;
      }

      return filterByType([field], filterFieldTypes).length !== 0;
    });

    return filteredFields;
  };
}
