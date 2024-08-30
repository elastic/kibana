/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataSourceProfileProvider } from '../../../profiles';
import { extendProfileProvider } from '../../extend_profile_provider';
import { createGetDefaultAppState } from '../accessors';
import { CLIENT_IP_COLUMN, HOST_NAME_COLUMN, MESSAGE_COLUMN } from '../consts';
import { createResolve } from './create_resolve';

export const createNginxAccessLogsDataSourceProfileProvider = (
  logsDataSourceProfileProvider: DataSourceProfileProvider
): DataSourceProfileProvider =>
  extendProfileProvider(logsDataSourceProfileProvider, {
    profileId: 'nginx-access-logs-data-source',
    profile: {
      getDefaultAppState: createGetDefaultAppState({
        defaultColumns: [
          { name: 'url.path', width: 150 },
          { name: 'http.response.status_code', width: 200 },
          CLIENT_IP_COLUMN,
          HOST_NAME_COLUMN,
          MESSAGE_COLUMN,
        ],
      }),
    },
    resolve: createResolve('logs-nginx.access'),
  });
