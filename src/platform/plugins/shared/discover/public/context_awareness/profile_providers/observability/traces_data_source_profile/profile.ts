/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { isDataSourceType, DataSourceType } from '../../../../../common/data_sources';
import { DataSourceCategory, DataSourceProfileProvider } from '../../../profiles';

export const createTracesDataSourceProfileProvider = (): DataSourceProfileProvider => ({
  profileId: 'traces-data-source-profile',
  isExperimental: true,
  profile: {
    getDefaultAppState: () => () => ({
      columns: [
        {
          name: '@timestamp',
          width: 212,
        },
        {
          name: 'span.name',
        },
        {
          name: 'service.name',
        },
      ],
      rowHeight: 5,
    }),
  },
  resolve: ({ dataSource, dataView, query }) => {
    let indexPattern: string | undefined;

    if (isDataSourceType(dataSource, DataSourceType.Esql)) {
      if (!isOfAggregateQueryType(query)) {
        return { isMatch: false };
      }

      indexPattern = getIndexPatternFromESQLQuery(query.esql);
    } else if (isDataSourceType(dataSource, DataSourceType.DataView) && dataView) {
      indexPattern = dataView.getIndexPattern();
    }

    if (indexPattern?.includes('traces')) {
      return {
        isMatch: true,
        context: {
          category: DataSourceCategory.Traces,
        },
      };
    }

    // TODO Define a better way to enable traces data source
    return { isMatch: false };
  },
});
