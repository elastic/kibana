/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataSourceCategory } from '../../../profiles';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import { type DataSourceProfileProvider } from '../../../profiles';

export const createDeprecationLogsDocumentProfileProvider = (): DataSourceProfileProvider<{
  formatRecord: (flattenedRecord: Record<string, unknown>) => string;
}> => ({
  profileId: 'deprecation-logs',
  profile: {
    getDefaultAppState: () => () => ({
      columns: [
        {
          name: 'log.level',
        },
        {
          name: 'message',
        }
      ],
    }),
  },
  resolve: (params) => {
    let indexPattern: string | undefined;

    if (isDataSourceType(params.dataSource, DataSourceType.Esql)) {
      if (!isOfAggregateQueryType(params.query)) {
        return { isMatch: false };
      }

      indexPattern = getIndexPatternFromESQLQuery(params.query.esql);
    } else if (isDataSourceType(params.dataSource, DataSourceType.DataView) && params.dataView) {
      indexPattern = params.dataView.getIndexPattern();
    }

    if (indexPattern !== '..logs-deprecation.elasticsearch-default') {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Logs,
        formatRecord: (record) => JSON.stringify(record, null, 2),
      },
    };
  },
});
