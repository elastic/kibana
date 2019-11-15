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
import { get } from 'lodash';
import { toastNotifications } from 'ui/notify';

import { AggConfig } from 'ui/vis';
import { timefilter } from 'ui/timefilter';
import { Vis } from '../../../vis';
import { SearchSource, SearchSourceContract } from '../../../courier';
import { esFilters, Query } from '../../../../../../plugins/data/public';

interface QueryGeohashBoundsParams {
  filters?: esFilters.Filter[];
  query?: Query;
  searchSource?: SearchSourceContract;
}

/**
 * Coordinate map visualization needs to be able to query for the latest geohash
 * bounds when a user clicks the "fit to data" map icon, which requires knowing
 * about global filters & queries. This logic has been extracted here so we can
 * keep `searchSource` out of the vis, but ultimately we need to design a
 * long-term solution for situations like this.
 *
 * TODO: Remove this as a part of elastic/kibana#30593
 */
export async function queryGeohashBounds(vis: Vis, params: QueryGeohashBoundsParams) {
  const agg = vis.getAggConfig().aggs.find((a: AggConfig) => {
    return get(a, 'type.dslName') === 'geohash_grid';
  });

  if (agg) {
    const searchSource = params.searchSource
      ? params.searchSource.createChild()
      : new SearchSource();
    searchSource.setField('size', 0);
    searchSource.setField('aggs', () => {
      const geoBoundsAgg = vis.getAggConfig().createAggConfig(
        {
          type: 'geo_bounds',
          enabled: true,
          params: {
            field: agg.getField(),
          },
          schema: 'metric',
        },
        {
          addToAggConfigs: false,
        }
      );
      return {
        '1': geoBoundsAgg.toDsl(),
      };
    });

    const { filters, query } = params;
    if (filters) {
      searchSource.setField('filter', () => {
        const activeFilters = [...filters];
        const indexPattern = agg.getIndexPattern();
        const useTimeFilter = !!indexPattern.timeFieldName;
        if (useTimeFilter) {
          const filter = timefilter.createFilter(indexPattern);
          if (filter) activeFilters.push((filter as any) as esFilters.Filter);
        }
        return activeFilters;
      });
    }
    if (query) {
      searchSource.setField('query', query);
    }

    try {
      const esResp = await searchSource.fetch();
      return get(esResp, 'aggregations.1.bounds');
    } catch (error) {
      toastNotifications.addDanger({
        title: i18n.translate('common.ui.visualize.queryGeohashBounds.unableToGetBoundErrorTitle', {
          defaultMessage: 'Unable to get bounds',
        }),
        text: `${error.message}`,
      });
      return;
    }
  }
}
