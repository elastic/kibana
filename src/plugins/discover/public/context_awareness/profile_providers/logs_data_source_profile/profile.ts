/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getLogLevelCoalescedValue, getLogLevelColor } from '@kbn/discover-utils';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { LogLevelBadgeCell } from '../../../components/data_types/logs/log_level_badge_cell';
import { DataSourceCategory, DataSourceProfileProvider } from '../../profiles';
import { ProfileProviderServices } from '../profile_provider_services';
import { extractIndexPatternFrom } from '../extract_index_pattern_from';

export const createLogsDataSourceProfileProvider = (
  services: ProfileProviderServices
): DataSourceProfileProvider => ({
  profileId: 'logs-data-source-profile',
  profile: {
    getRowIndicatorColor: () => getRowIndicatorColor,
    getDefaultAppState: (prev) => (params) => {
      const prevState = prev(params);
      const columns = prevState?.columns ?? [];

      if (params.dataView.isTimeBased()) {
        columns.push({ name: params.dataView.timeFieldName, width: 212 });
      }

      columns.push({ name: 'log.level', width: 150 }, { name: 'message' });

      return { columns, rowHeight: 0 };
    },
    getCellRenderers: (prev) => () => ({
      ...prev(),
      'log.level': LogLevelBadgeCell,
    }),
    getFieldListSubgroups: (prev) => () => {
      const prevValue = prev();

      return {
        subgroups: [
          ...prevValue.subgroups,
          {
            id: 'aws-s3',
            title: 'AWS S3',
          },
          {
            id: 'container',
            title: 'Container',
          },
          {
            id: 'event',
            title: 'Event',
          },
          {
            id: 'host',
            title: 'Host',
          },
          {
            id: 'http',
            title: 'HTTP',
          },
          {
            id: 'kubernetes',
            title: 'Kubernetes',
          },
          {
            id: 'log',
            title: 'Log',
          },
          {
            id: 'process',
            title: 'Process',
          },
        ],
        getSubgroupId: (field) => {
          if (field.name.startsWith('aws.s3.')) {
            return 'aws-s3';
          }
          if (field.name.startsWith('container.')) {
            return 'container';
          }
          if (field.name.startsWith('event.')) {
            return 'event';
          }
          if (field.name.startsWith('host.')) {
            return 'host';
          }
          if (field.name.startsWith('http.')) {
            return 'http';
          }
          if (field.name.startsWith('kubernetes.')) {
            return 'kubernetes';
          }
          if (field.name.startsWith('log.') || field.name === 'message') {
            return 'log';
          }
          if (field.name.startsWith('process.')) {
            return 'process';
          }
          return prevValue.getSubgroupId(field);
        },
      };
    },
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

const getRowIndicatorColor: UnifiedDataTableProps['getRowIndicatorColor'] = (row, euiTheme) => {
  const logLevel = row.flattened['log.level'] || row.flattened.log_level;
  const logLevelCoalescedValue = getLogLevelCoalescedValue(logLevel);

  if (logLevelCoalescedValue) {
    return getLogLevelColor(logLevelCoalescedValue, euiTheme);
  }

  return undefined;
};
