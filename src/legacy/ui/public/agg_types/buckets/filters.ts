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
import angular from 'angular';

import { i18n } from '@kbn/i18n';

import chrome from 'ui/chrome';
import { FiltersParamEditor, FilterValue } from '../../vis/editors/default/controls/filters';
import { createFilterFilters } from './create_filter/filters';
import { BucketAggType } from './_bucket_agg_type';
import { Storage } from '../../../../../plugins/kibana_utils/public';
import { getQueryLog, esQuery } from '../../../../../plugins/data/public';

const config = chrome.getUiSettingsClient();
const storage = new Storage(window.localStorage);

const filtersTitle = i18n.translate('common.ui.aggTypes.buckets.filtersTitle', {
  defaultMessage: 'Filters',
  description:
    'The name of an aggregation, that allows to specify multiple individual filters to group data by.',
});

export const filtersBucketAgg = new BucketAggType({
  name: 'filters',
  title: filtersTitle,
  createFilter: createFilterFilters,
  customLabels: false,
  params: [
    {
      name: 'filters',
      editorComponent: FiltersParamEditor,
      default: [{ input: { query: '', language: config.get('search:queryLanguage') }, label: '' }],
      write(aggConfig, output) {
        const inFilters: FilterValue[] = aggConfig.params.filters;
        if (!_.size(inFilters)) return;

        inFilters.forEach(filter => {
          const persistedLog = getQueryLog(config, storage, 'filtersAgg', filter.input.language);
          persistedLog.add(filter.input.query);
        });

        const outFilters = _.transform(
          inFilters,
          function(filters, filter) {
            const input = _.cloneDeep(filter.input);

            if (!input) {
              console.log('malformed filter agg params, missing "input" query'); // eslint-disable-line no-console
              return;
            }

            const esQueryConfigs = esQuery.getEsQueryConfig(config);
            const query = esQuery.buildEsQuery(
              aggConfig.getIndexPattern(),
              [input],
              [],
              esQueryConfigs
            );
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
                : angular.toJson(filter.input.query));
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
