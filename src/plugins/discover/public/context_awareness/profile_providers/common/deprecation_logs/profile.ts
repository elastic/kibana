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
import { DEPRECATION_LOGS_PROFILE_ID } from './consts';

export const createDeprecationLogsDocumentProfileProvider = (): DataSourceProfileProvider<{
  formatRecord: (flattenedRecord: Record<string, unknown>) => string;
}> => ({
  profileId: DEPRECATION_LOGS_PROFILE_ID,
  profile: {
    getDefaultAppState: () => () => ({
      columns: [
        { name: 'log.level' },
        { name: 'message' },
        { name: 'x-opaque-id' },
        { name: 'elasticsearch.cluster.name' },
        { name: 'elasticsearch.event.category' }
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

    if (!checkAllIndicesInPatternAreDeprecationLogs(indexPattern)) {
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

const checkAllIndicesInPatternAreDeprecationLogs = (indexPattern: string | undefined): boolean => {
  if (!indexPattern) {
    return false;
  }
  const indexPatternArray = indexPattern.split(',');
  const result = indexPatternArray.reduce(
    (acc, val) => acc && val.startsWith('.logs-deprecation'),
    true
  );
  return result;
}