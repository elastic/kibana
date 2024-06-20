/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { LogLevelBadgeCell } from '../../../components/data_types/logs/log_level_badge_cell';
import { isDataViewSource, isEsqlSource } from '../../../../common/data_sources';
import {
  DataSourceCategory,
  DataSourceProfileProvider,
  DataSourceProfileProviderParams,
} from '../../profiles';
import { ProfileProviderServices } from '../profile_provider_services';

export const createLogsDataSourceProfileProvider = (
  services: ProfileProviderServices
): DataSourceProfileProvider => ({
  profileId: 'logs-data-source-profile',
  profile: {
    getDefaultAppState: (prev) => (params) => {
      const prevState = prev(params);
      const columns = prevState?.columns ?? [];

      if (params.dataView.isTimeBased()) {
        columns.push({ name: params.dataView.timeFieldName, width: 212 });
      }

      columns.push({ name: 'log.level', width: 100 }, { name: 'message' });

      return { columns, rowHeight: 0 };
    },
    getCellRenderers: (prev) => () => ({
      ...prev(),
      'log.level': LogLevelBadgeCell,
    }),
  },
  resolve: (params) => {
    const indexPattern = extractIndexPatternFrom(params);

    if (!services.logsContextService.isLogsIndexPattern(indexPattern)) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: { category: DataSourceCategory.Logs },
    };
  },
});

const extractIndexPatternFrom = ({
  dataSource,
  dataView,
  query,
}: DataSourceProfileProviderParams) => {
  if (isEsqlSource(dataSource) && isOfAggregateQueryType(query)) {
    return getIndexPatternFromESQLQuery(query.esql);
  } else if (isDataViewSource(dataSource) && dataView) {
    return dataView.getIndexPattern();
  }

  return null;
};
