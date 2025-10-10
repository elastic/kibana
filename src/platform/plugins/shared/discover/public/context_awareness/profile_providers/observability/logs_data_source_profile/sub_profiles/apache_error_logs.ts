/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { LogsDataSourceProfileProvider } from '../profile';
import { extendProfileProvider } from '../../../extend_profile_provider';
import { createGetDefaultAppState, createRecommendedFields } from '../accessors';
import { CLIENT_IP_COLUMN, LOG_LEVEL_COLUMN, MESSAGE_COLUMN } from '../consts';
import { createResolve } from './create_resolve';

export const APACHE_LOGS_RECOMMENDED_FIELD_NAMES: Array<DataViewField['name']> = [
  'http.request.method',
  'url.path',
  'http.response.status_code',
  'http.response.bytes',
  'client.ip',
  'user.agent',
  'referrer',
  'message',
  'log.level',
  'source.ip',
  'destination.ip',
];

export const createApacheErrorLogsDataSourceProfileProvider = (
  logsDataSourceProfileProvider: LogsDataSourceProfileProvider
): LogsDataSourceProfileProvider =>
  extendProfileProvider(logsDataSourceProfileProvider, {
    profileId: 'observability-apache-error-logs-data-source-profile',
    profile: {
      getDefaultAppState: createGetDefaultAppState({
        defaultColumns: [LOG_LEVEL_COLUMN, CLIENT_IP_COLUMN, MESSAGE_COLUMN],
      }),
      getRecommendedFields: createRecommendedFields({
        defaultFields: APACHE_LOGS_RECOMMENDED_FIELD_NAMES,
      }),
    },
    resolve: createResolve('logs-apache.error'),
  });
