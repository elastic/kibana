/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { isDataViewSource, isEsqlSource } from '../../../../common/data_sources';
import {
  DataSourceCategory,
  DataSourceProfileProvider,
  DataSourceProfileProviderParams,
} from '../../profiles';
import { ProfileProviderServices } from '../profile_provider_services';
import { getRowIndicatorProvider } from './accessors';

export const createLogsDataSourceProfileProvider = (
  services: ProfileProviderServices
): DataSourceProfileProvider => ({
  profileId: 'logs-data-source-profile',
  profile: {
    getRowIndicatorProvider,
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
