/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataSourceCategory, DataSourceProfileProvider } from '../../../profiles';
import { extendProfileProvider } from '../../extend_profile_provider';
import { extractIndexPatternFrom } from '../../extract_index_pattern_from';

export const createSystemLogsDataSourceProfileProvider = (
  logsDataSourceProfileProvider: DataSourceProfileProvider
): DataSourceProfileProvider =>
  extendProfileProvider(logsDataSourceProfileProvider, {
    profileId: 'system_logs_data_source',
    profile: {
      getDefaultAppState: () => (params) => {
        const columns = [];

        if (params.dataView.isTimeBased()) {
          columns.push({ name: params.dataView.timeFieldName, width: 212 });
        }

        columns.push(
          { name: 'log.level', width: 150 },
          { name: 'process.name', width: 150 },
          { name: 'host.name', width: 250 },
          { name: 'message' }
        );

        return { columns, rowHeight: 0 };
      },
    },
    resolve: (params) => {
      const indexPattern = extractIndexPatternFrom(params);

      if (!indexPattern?.startsWith('logs-system_')) {
        return { isMatch: false };
      }

      return {
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      };
    },
  });
