/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { createEsqlDataSource } from '../../../../../common/data_sources';
import { DataSourceCategory, RootContext, SolutionType } from '../../../profiles';
import { createContextAwarenessMocks } from '../../../__mocks__';
import { createLogsDataSourceProfileProvider } from '../profile';
import { createNginxAccessLogsDataSourceProfileProvider } from './nginx_access_logs';

const ROOT_CONTEXT: RootContext = { solutionType: SolutionType.Default };
const { profileProviderServices } = createContextAwarenessMocks();
const logsDataSourceProfileProvider = createLogsDataSourceProfileProvider(profileProviderServices);
const dataSourceProfileProvider = createNginxAccessLogsDataSourceProfileProvider(
  logsDataSourceProfileProvider
);

describe('createNginxAccessLogsDataSourceProfileProvider', () => {
  it('should match a valid index pattern', async () => {
    const result = await dataSourceProfileProvider.resolve({
      rootContext: ROOT_CONTEXT,
      dataSource: createEsqlDataSource(),
      query: { esql: 'FROM logs-nginx.access-*' },
    });
    expect(result).toEqual({ isMatch: true, context: { category: DataSourceCategory.Logs } });
  });

  it('should not match an invalid index pattern', async () => {
    const result = await dataSourceProfileProvider.resolve({
      rootContext: ROOT_CONTEXT,
      dataSource: createEsqlDataSource(),
      query: { esql: 'FROM logs-nginx.error-*' },
    });
    expect(result).toEqual({ isMatch: false });
  });

  it('should return default app state', () => {
    const getDefaultAppState = dataSourceProfileProvider.profile.getDefaultAppState?.(() => ({}));
    expect(getDefaultAppState?.({ dataView: dataViewWithTimefieldMock })).toEqual({
      columns: [
        { name: 'timestamp', width: 212 },
        { name: 'url.path', width: 150 },
        { name: 'http.response.status_code', width: 200 },
        { name: 'client.ip', width: 150 },
        { name: 'host.name', width: 250 },
        { name: 'message' },
      ],
    });
  });
});
