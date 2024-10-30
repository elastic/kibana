/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataSourceProfileProvider } from '../../../../profiles';
import { extendProfileProvider } from '../../../extend_profile_provider';
import { createGetDefaultAppState } from '../accessors';
import { LOG_LEVEL_COLUMN, MESSAGE_COLUMN } from '../consts';
import { createResolve } from './create_resolve';

export const createNginxErrorLogsDataSourceProfileProvider = (
  logsDataSourceProfileProvider: DataSourceProfileProvider
): DataSourceProfileProvider =>
  extendProfileProvider(logsDataSourceProfileProvider, {
    profileId: 'nginx-error-logs-data-source',
    profile: {
      getDefaultAppState: createGetDefaultAppState({
        defaultColumns: [LOG_LEVEL_COLUMN, MESSAGE_COLUMN],
      }),
    },
    resolve: createResolve('logs-nginx.error'),
  });
