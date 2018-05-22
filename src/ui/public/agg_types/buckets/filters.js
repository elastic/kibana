import _ from 'lodash';
import angular from 'angular';
import { luceneStringToDsl } from '../../courier/data_source/build_query/lucene_string_to_dsl.js';

import { BucketAggType } from './_bucket_agg_type';
import { createFilterFilters } from './create_filter/filters';
import { decorateQuery } from '../../courier/data_source/_decorate_query';
import filtersTemplate from '../controls/filters.html';

export const filtersBucketAgg = new BucketAggType({
  name: 'filters',
  title: 'Filters',
  createFilter: createFilterFilters,
  customLabels: false,
  params: [
    {
      name: 'filters',
      editor: filtersTemplate,
      default: [ { input: {}, label: '' } ],
      write: function (aggConfig, output) {
        const inFilters = aggConfig.params.filters;
        if (!_.size(inFilters)) return;

        const outFilters = _.transform(inFilters, function (filters, filter) {
          const input = _.cloneDeep(filter.input);

          if (!input) {
            console.log('malformed filter agg params, missing "input" query'); // eslint-disable-line no-console
            return;
          }

          const query = input.query = luceneStringToDsl(input.query);
          if (!query) {
            console.log('malformed filter agg params, missing "query" on input'); // eslint-disable-line no-console
            return;
          }

          decorateQuery(query);

          const matchAllLabel = (filter.input.query === '' && _.has(query, 'match_all')) ? '*' : '';
          const label = filter.label || matchAllLabel || _.get(query, 'query_string.query') || angular.toJson(query);
          filters[label] = input;
        }, {});

        if (!_.size(outFilters)) return;

        const params = output.params || (output.params = {});
        params.filters = outFilters;
      }
    }
  ]
});
