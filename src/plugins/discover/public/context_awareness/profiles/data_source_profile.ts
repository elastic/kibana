/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { AggregateQuery, isOfAggregateQueryType, Query } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { DataSourceType, DiscoverDataSource, isDataSourceType } from '../../../common/data_sources';
import { Profile } from '../composable_profile';
import { ProfileService } from '../profile_service';

export enum DataSourceCategory {
  Logs = 'logs',
  Default = 'default',
}

export interface DataSourceProfileProviderParams {
  dataSource?: DiscoverDataSource;
  dataView?: DataView;
  query?: Query | AggregateQuery;
}

export interface DataSourceContext {
  category: DataSourceCategory;
}

export const dataSourceProfileService = new ProfileService<
  Profile,
  DataSourceProfileProviderParams,
  DataSourceContext
>();

dataSourceProfileService.registerProvider({
  order: 0,
  profile: {
    getTopNavItems: (prev) => () =>
      [
        {
          id: 'logs-data-source-entry',
          label: 'Logs data source entry',
          run: () => {
            alert('HELLO WORLD');
          },
        },
        ...prev(),
      ],
  },
  resolve: (params) => {
    let indices: string[] = [];

    if (isDataSourceType(params.dataSource, DataSourceType.Esql)) {
      if (!isOfAggregateQueryType(params.query)) {
        return { isMatch: false };
      }

      indices = getIndexPatternFromESQLQuery(params.query.esql).split(',');
    } else if (isDataSourceType(params.dataSource, DataSourceType.DataView) && params.dataView) {
      indices = params.dataView.getIndexPattern().split(',');
    }

    if (indices.every((index) => index.includes('logs'))) {
      return {
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      };
    }

    return { isMatch: false };
  },
});
