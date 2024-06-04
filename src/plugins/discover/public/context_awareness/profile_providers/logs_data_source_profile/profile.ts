/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRegExpPatternFrom, testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { isDataViewSource, isEsqlSource } from '../../../../common/data_sources';
import {
  DataSourceCategory,
  DataSourceProfileProvider,
  DataSourceProfileProviderParams,
} from '../../profiles';

export const ALLOWED_LOGS_DATA_SOURCES = [
  createRegExpPatternFrom(['log', 'logs', 'logstash', 'auditbeat', 'filebeat', 'winlogbeat']),
];

export const logsDataSourceProfileProvider: DataSourceProfileProvider = {
  profileId: 'logs-data-source-profile',
  profile: {},
  resolve: (params) => {
    const indexPattern = extractIndexPatternFrom(params);

    if (!indexPattern) {
      return { isMatch: false };
    }

    if (testPatternAgainstAllowedList(ALLOWED_LOGS_DATA_SOURCES)(indexPattern)) {
      return {
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      };
    }

    return { isMatch: false };
  },
};

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
