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

import { IUiSettingsClient } from 'src/core/public';

import { createFilterFilters } from './create_filter/filters';
import { toAngularJSON } from '../utils';
import { BucketAggType } from './_bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { Storage } from '../../../../../../plugins/kibana_utils/public';

import { getEsQueryConfig, buildEsQuery, Query } from '../../../../common';
import { getQueryLog } from '../../../query';

const filtersTitle = i18n.translate('data.search.aggs.buckets.filtersTitle', {
  defaultMessage: 'Filters',
  description:
    'The name of an aggregation, that allows to specify multiple individual filters to group data by.',
});

interface FilterValue {
  input: Query;
  label: string;
  id: string;
}

export function getFiltersBucketAgg(deps: { uiSettings: IUiSettingsClient }) {
  const { uiSettings } = deps;
  return new BucketAggType({
    name: BUCKET_TYPES.FILTERS,
    title: filtersTitle,
    createFilter: createFilterFilters,
    customLabels: false,
    params: [
      {
        name: 'filters',
        default: [
          { input: { query: '', language: uiSettings.get('search:queryLanguage') }, label: '' },
        ],
        write(aggConfig, output) {
          const inFilters: FilterValue[] = aggConfig.params.filters;
          if (!_.size(inFilters)) return;

          inFilters.forEach((filter) => {
            const persistedLog = getQueryLog(
              uiSettings,
              new Storage(window.localStorage),
              'vis_default_editor',
              filter.input.language
            );
            persistedLog.add(filter.input.query);
          });

          const outFilters = _.transform(
            inFilters,
            function (filters, filter) {
              const input = _.cloneDeep(filter.input);

              if (!input) {
                console.log('malformed filter agg params, missing "input" query'); // eslint-disable-line no-console
                return;
              }

              const esQueryConfigs = getEsQueryConfig(uiSettings);
              const query = buildEsQuery(aggConfig.getIndexPattern(), [input], [], esQueryConfigs);

              if (!query) {
                console.log('malformed filter agg params, missing "query" on input'); // eslint-disable-line no-console
                return;
              }

              const matchAllLabel = filter.input.query === '' ? '*' : '';
              const label =
                filter.label ||
                matchAllLabel ||
                (typeof filter.input.query === 'string'
                  ? filter.input.query
                  : toAngularJSON(filter.input.query));
              filters[label] = { query };
            },
            {}
          );

          if (!_.size(outFilters)) return;

          const params = output.params || (output.params = {});
          params.filters = outFilters;
        },
      },
    ],
  });
}
