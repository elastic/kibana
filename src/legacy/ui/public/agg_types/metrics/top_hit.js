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

import _ from 'lodash';
import { MetricAggType } from './metric_agg_type';
import { TopSortFieldParamEditor } from '../controls/top_sort_field';
import { OrderParamEditor } from '../controls/order';
import { aggTypeFieldFilters } from '../param_types/filter';
import { i18n } from '@kbn/i18n';
import { wrapWithInlineComp } from '../buckets/_inline_comp_wrapper';
import { TopFieldParamEditor } from '../controls/top_field';
import { TopSizeParamEditor } from '../controls/top_size';
import { TopAggregateParamEditor } from '../controls/top_aggregate';

const isNumber = function (type) {
  return type === 'number';
};

aggTypeFieldFilters.addFilter(
  (
    field,
    fieldParamType,
    aggConfig,
    vis
  ) => {
    if (aggConfig.type.name !== 'top_hit' || vis.type.name === 'table' || vis.type.name === 'metric') {
      return true;
    }
    return field.type === 'number';

  });

export const topHitMetricAgg = new MetricAggType({
  name: 'top_hits',
  title: i18n.translate('common.ui.aggTypes.metrics.topHitTitle', {
    defaultMessage: 'Top Hit'
  }),
  makeLabel: function (aggConfig) {
    const lastPrefixLabel = i18n.translate('common.ui.aggTypes.metrics.topHit.lastPrefixLabel', {
      defaultMessage: 'Last'
    });
    const firstPrefixLabel = i18n.translate('common.ui.aggTypes.metrics.topHit.firstPrefixLabel', {
      defaultMessage: 'First'
    });
    let prefix = aggConfig.params.sortOrder.value === 'desc' ? lastPrefixLabel : firstPrefixLabel;
    if (aggConfig.params.size !== 1) {
      prefix += ` ${aggConfig.params.size}`;
    }
    const field = aggConfig.params.field;
    return `${prefix} ${field ? field.displayName : ''}`;
  },
  params: [
    {
      name: 'field',
      type: 'field',
      editorComponent: TopFieldParamEditor,
      onlyAggregatable: false,
      filterFieldTypes: '*',
      write(agg, output) {
        const field = agg.params.field;
        output.params = {};

        if (field.scripted) {
          output.params.script_fields = {
            [ field.name ]: {
              script: {
                source: field.script,
                lang: field.lang
              }
            }
          };
        } else {
          if (field.readFromDocValues) {
            // always format date fields as date_time to avoid
            // displaying unformatted dates like epoch_millis
            // or other not-accepted momentjs formats
            const format = field.type === 'date' ? 'date_time' : 'use_field_mapping';
            output.params.docvalue_fields = [ { field: field.name, format } ];
          }
          output.params._source = field.name === '_source' ? true : field.name;
        }
      }
    },
    {
      name: 'aggregate',
      type: 'select',
      editorComponent: wrapWithInlineComp(TopAggregateParamEditor),
      options: [
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.minLabel', {
            defaultMessage: 'Min'
          }),
          isCompatibleType: isNumber,
          isCompatibleVis: _.constant(true),
          disabled: true,
          value: 'min'
        },
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.maxLabel', {
            defaultMessage: 'Max'
          }),
          isCompatibleType: isNumber,
          isCompatibleVis: _.constant(true),
          disabled: true,
          value: 'max'
        },
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.sumLabel', {
            defaultMessage: 'Sum'
          }),
          isCompatibleType: isNumber,
          isCompatibleVis: _.constant(true),
          disabled: true,
          value: 'sum'
        },
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.averageLabel', {
            defaultMessage: 'Average'
          }),
          isCompatibleType: isNumber,
          isCompatibleVis: _.constant(true),
          disabled: true,
          value: 'average'
        },
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.concatenateLabel', {
            defaultMessage: 'Concatenate'
          }),
          isCompatibleType: _.constant(true),
          isCompatibleVis: function (name) {
            return name === 'metric' || name === 'table';
          },
          disabled: true,
          value: 'concat'
        }
      ],
      write: _.noop
    },
    {
      name: 'size',
      editorComponent: wrapWithInlineComp(TopSizeParamEditor),
      default: 1
    },
    {
      name: 'sortField',
      type: 'field',
      editorComponent: TopSortFieldParamEditor,
      filterFieldTypes: [ 'number', 'date', 'ip',  'string' ],
      default: function (agg) {
        return agg.getIndexPattern().timeFieldName;
      },
      write: _.noop // prevent default write, it is handled below
    },
    {
      name: 'sortOrder',
      type: 'select',
      default: 'desc',
      editorComponent: OrderParamEditor,
      options: [
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.descendingLabel', {
            defaultMessage: 'Descending'
          }),
          value: 'desc'
        },
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.ascendingLabel', {
            defaultMessage: 'Ascending'
          }),
          value: 'asc'
        }
      ],
      write(agg, output) {
        const sortField = agg.params.sortField;
        const sortOrder = agg.params.sortOrder;

        if (sortField.scripted) {
          output.params.sort = [
            {
              _script: {
                script: {
                  source: sortField.script,
                  lang: sortField.lang
                },
                type: sortField.type,
                order: sortOrder.value
              }
            }
          ];
        } else {
          output.params.sort = [
            {
              [ sortField.name ]: {
                order: sortOrder.value
              }
            }
          ];
        }
      }
    }
  ],
  getValue(agg, bucket) {
    const hits = _.get(bucket, `${agg.id}.hits.hits`);
    if (!hits || !hits.length) {
      return null;
    }
    const path = agg.params.field.name;

    let values = _(hits).map(hit => {
      return path === '_source' ? hit._source : agg.getIndexPattern().flattenHit(hit, true)[path];
    })
      .flatten()
      .value();

    if (values.length === 1) {
      values = values[0];
    }

    if (Array.isArray(values)) {
      if (!_.compact(values).length) {
        return null;
      }
      switch (agg.params.aggregate.value) {
        case 'max':
          return _.max(values);
        case 'min':
          return _.min(values);
        case 'sum':
          return _.sum(values);
        case 'average':
          return _.sum(values) / values.length;
      }
    }
    return values;
  }
});
