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
import { i18n } from '@kbn/i18n';

import { TopSortFieldParamEditor } from 'ui/vis/editors/default/controls/top_sort_field';
import { OrderParamEditor } from 'ui/vis/editors/default/controls/order';
import { TopFieldParamEditor } from 'ui/vis/editors/default/controls/top_field';
import { TopSizeParamEditor } from 'ui/vis/editors/default/controls/top_size';
import { TopAggregateParamEditor } from 'ui/vis/editors/default/controls/top_aggregate';

import { IMetricAggConfig, MetricAggType } from './metric_agg_type';
import { aggTypeFieldFilters } from '../param_types/filter';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../../../../../../plugins/data/public';

// @ts-ignore
import { wrapWithInlineComp } from '../buckets/inline_comp_wrapper';

const isNumericFieldSelected = (agg: IMetricAggConfig) => {
  const field = agg.getParam('field');

  return field && field.type && field.type === KBN_FIELD_TYPES.NUMBER;
};

aggTypeFieldFilters.addFilter((field, aggConfig) => {
  if (
    aggConfig.type.name !== METRIC_TYPES.TOP_HITS ||
    _.get(aggConfig.schema, 'aggSettings.top_hits.allowStrings', false)
  ) {
    return true;
  }

  return field.type === KBN_FIELD_TYPES.NUMBER;
});

export const topHitMetricAgg = new MetricAggType({
  name: METRIC_TYPES.TOP_HITS,
  title: i18n.translate('common.ui.aggTypes.metrics.topHitTitle', {
    defaultMessage: 'Top Hit',
  }),
  makeLabel(aggConfig) {
    const lastPrefixLabel = i18n.translate('common.ui.aggTypes.metrics.topHit.lastPrefixLabel', {
      defaultMessage: 'Last',
    });
    const firstPrefixLabel = i18n.translate('common.ui.aggTypes.metrics.topHit.firstPrefixLabel', {
      defaultMessage: 'First',
    });

    let prefix =
      aggConfig.getParam('sortOrder').value === 'desc' ? lastPrefixLabel : firstPrefixLabel;

    const size = aggConfig.getParam('size');

    if (size !== 1) {
      prefix += ` ${size}`;
    }

    const field = aggConfig.getParam('field');

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
        const field = agg.getParam('field');
        output.params = {};

        if (field.scripted) {
          output.params.script_fields = {
            [field.name]: {
              script: {
                source: field.script,
                lang: field.lang,
              },
            },
          };
        } else {
          if (field.readFromDocValues) {
            // always format date fields as date_time to avoid
            // displaying unformatted dates like epoch_millis
            // or other not-accepted momentjs formats
            const format = field.type === KBN_FIELD_TYPES.DATE ? 'date_time' : 'use_field_mapping';
            output.params.docvalue_fields = [{ field: field.name, format }];
          }
          output.params._source = field.name === '_source' ? true : field.name;
        }
      },
    },
    {
      name: 'aggregate',
      type: 'optioned',
      editorComponent: wrapWithInlineComp(TopAggregateParamEditor),
      options: [
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.minLabel', {
            defaultMessage: 'Min',
          }),
          isCompatible: isNumericFieldSelected,
          disabled: true,
          value: 'min',
        },
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.maxLabel', {
            defaultMessage: 'Max',
          }),
          isCompatible: isNumericFieldSelected,
          disabled: true,
          value: 'max',
        },
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.sumLabel', {
            defaultMessage: 'Sum',
          }),
          isCompatible: isNumericFieldSelected,
          disabled: true,
          value: 'sum',
        },
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.averageLabel', {
            defaultMessage: 'Average',
          }),
          isCompatible: isNumericFieldSelected,
          disabled: true,
          value: 'average',
        },
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.concatenateLabel', {
            defaultMessage: 'Concatenate',
          }),
          isCompatible(aggConfig: IMetricAggConfig) {
            return _.get(aggConfig.schema, 'aggSettings.top_hits.allowStrings', false);
          },
          disabled: true,
          value: 'concat',
        },
      ],
      write: _.noop,
    },
    {
      name: 'size',
      editorComponent: wrapWithInlineComp(TopSizeParamEditor),
      default: 1,
    },
    {
      name: 'sortField',
      type: 'field',
      editorComponent: TopSortFieldParamEditor,
      filterFieldTypes: [
        KBN_FIELD_TYPES.NUMBER,
        KBN_FIELD_TYPES.DATE,
        KBN_FIELD_TYPES.IP,
        KBN_FIELD_TYPES.STRING,
      ],
      default(agg: IMetricAggConfig) {
        return agg.getIndexPattern().timeFieldName;
      },
      write: _.noop, // prevent default write, it is handled below
    },
    {
      name: 'sortOrder',
      type: 'optioned',
      default: 'desc',
      editorComponent: OrderParamEditor,
      options: [
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.descendingLabel', {
            defaultMessage: 'Descending',
          }),
          value: 'desc',
        },
        {
          text: i18n.translate('common.ui.aggTypes.metrics.topHit.ascendingLabel', {
            defaultMessage: 'Ascending',
          }),
          value: 'asc',
        },
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
                  lang: sortField.lang,
                },
                type: sortField.type,
                order: sortOrder.value,
              },
            },
          ];
        } else {
          output.params.sort = [
            {
              [sortField.name]: {
                order: sortOrder.value,
              },
            },
          ];
        }
      },
    },
  ],
  getValue(agg, bucket) {
    const hits: any[] = _.get(bucket, `${agg.id}.hits.hits`);
    if (!hits || !hits.length) {
      return null;
    }
    const path = agg.getParam('field').name;

    let values = _.flatten(
      hits.map(hit =>
        path === '_source' ? hit._source : agg.getIndexPattern().flattenHit(hit, true)[path]
      )
    );

    if (values.length === 1) {
      values = values[0];
    }

    if (Array.isArray(values)) {
      if (!_.compact(values).length) {
        return null;
      }

      const aggregate = agg.getParam('aggregate');

      switch (aggregate.value) {
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
  },
});
