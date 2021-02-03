/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IAggConfig } from '../agg_config';
import { SavedObjectNotFound } from '../../../../../../plugins/kibana_utils/common';
import { BaseParamType } from './base';
import { propFilter } from '../utils';
import { KBN_FIELD_TYPES } from '../../../kbn_field_types/types';
import { isNestedField, IndexPatternField } from '../../../index_patterns/fields';

const filterByType = propFilter('type');

export type FieldTypes = KBN_FIELD_TYPES | KBN_FIELD_TYPES[] | '*';
// TODO need to make a more explicit interface for this
export type IFieldParamType = FieldParamType;

export class FieldParamType extends BaseParamType {
  required = true;
  scriptable = true;
  filterFieldTypes: FieldTypes;
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

      const validField = this.getAvailableFields(aggConfig).find((f: any) => f.name === fieldName);
      if (!validField) {
        throw new Error(
          i18n.translate(
            'data.search.aggs.paramTypes.field.invalidSavedFieldParameterErrorMessage',
            {
              defaultMessage:
                'Saved field "{fieldParameter}" of index pattern "{indexPatternTitle}" is invalid for use with the "{aggType}" aggregation. Please select a new field.',
              values: {
                fieldParameter: fieldName,
                aggType: aggConfig?.type?.title,
                indexPatternTitle: aggConfig.getIndexPattern().title,
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
        (onlyAggregatable && (!field.aggregatable || isNestedField(field))) ||
        (!scriptable && field.scripted)
      ) {
        return false;
      }

      return filterByType([field], filterFieldTypes).length !== 0;
    });

    return filteredFields;
  };
}
