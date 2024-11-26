/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { createEsqlDataSource } from '../../../../../../common/data_sources';
import { DataSourceCategory, RootContext, SolutionType } from '../../../../profiles';
import { createContextAwarenessMocks } from '../../../../__mocks__';
import { createLogsDataSourceProfileProvider } from '../profile';
import { createNginxAccessLogsDataSourceProfileProvider } from './nginx_access_logs';
import { ContextWithProfileId } from '../../../../profile_service';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../../consts';

const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
  profileId: OBSERVABILITY_ROOT_PROFILE_ID,
  solutionType: SolutionType.Observability,
};
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
    const getDefaultAppState = dataSourceProfileProvider.profile.getDefaultAppState?.(() => ({}), {
      context: { category: DataSourceCategory.Logs },
    });
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
