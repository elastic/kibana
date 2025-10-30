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
import type { RootContext } from '../../../../profiles';
import { SolutionType } from '../../../../profiles';
import { createProfileProviderSharedServicesMock } from '../../../../__mocks__';
import { createLogsDataSourceProfileProvider } from '../profile';
import type { ContextWithProfileId } from '../../../../profile_service';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../../consts';
import { createIntegrationLogsDataSourceProfileProviders } from './integration_logs';
import { RESOLUTION_MATCH } from '../__mocks__';

const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
  profileId: OBSERVABILITY_ROOT_PROFILE_ID,
  solutionType: SolutionType.Observability,
};
const profileProviderServices = createProfileProviderSharedServicesMock();
const logsDataSourceProfileProvider = createLogsDataSourceProfileProvider(profileProviderServices);

describe('createIntegrationLogsDataSourceProfileProviders', () => {
  const providers = createIntegrationLogsDataSourceProfileProviders(logsDataSourceProfileProvider);

  // Helper to get the expected columns for each profile
  const expectedColumnsMap: Record<string, Array<{ name: string; width?: number }>> = {
    'observability-apache-error-logs-data-source-profile': [
      { name: 'timestamp', width: 212 },
      { name: 'log.level', width: 150 },
      { name: 'client.ip', width: 150 },
      { name: 'message' },
    ],
    'observability-aws-s3access-logs-data-source-profile': [
      { name: 'timestamp', width: 212 },
      { name: 'aws.s3.bucket.name', width: 200 },
      { name: 'aws.s3.object.key', width: 200 },
      { name: 'aws.s3access.operation', width: 200 },
      { name: 'client.ip', width: 150 },
      { name: 'message' },
    ],
    'observability-kubernetes-container-logs-data-source-profile': [
      { name: 'timestamp', width: 212 },
      { name: 'log.level', width: 150 },
      { name: 'kubernetes.pod.name', width: 200 },
      { name: 'kubernetes.namespace', width: 200 },
      { name: 'orchestrator.cluster.name', width: 200 },
      { name: 'message' },
    ],
    'observability-nginx-access-logs-data-source-profile': [
      { name: 'timestamp', width: 212 },
      { name: 'url.path', width: 150 },
      { name: 'http.response.status_code', width: 200 },
      { name: 'client.ip', width: 150 },
      { name: 'host.name', width: 250 },
      { name: 'message' },
    ],
    'observability-nginx-error-logs-data-source-profile': [
      { name: 'timestamp', width: 212 },
      { name: 'log.level', width: 150 },
      { name: 'message' },
    ],
    'observability-system-logs-data-source-profile': [
      { name: 'timestamp', width: 212 },
      { name: 'log.level', width: 150 },
      { name: 'process.name', width: 150 },
      { name: 'host.name', width: 250 },
      { name: 'message' },
    ],
    'observability-windows-logs-data-source-profile': [
      { name: 'timestamp', width: 212 },
      { name: 'log.level', width: 150 },
      { name: 'host.name', width: 250 },
      { name: 'message' },
    ],
  };

  // Helper to get a valid and invalid index pattern for each profile
  const indexPatternMap: Record<string, { valid: string; invalid: string }> = {
    'observability-apache-error-logs-data-source-profile': {
      valid: 'logs-apache.error-*',
      invalid: 'logs-apache.access-*',
    },
    'observability-aws-s3access-logs-data-source-profile': {
      valid: 'logs-aws.s3access-*',
      invalid: 'logs-aws.s3noaccess-*',
    },
    'observability-kubernetes-container-logs-data-source-profile': {
      valid: 'logs-kubernetes.container_logs-*',
      invalid: 'logs-kubernetes.access_logs-*',
    },
    'observability-nginx-access-logs-data-source-profile': {
      valid: 'logs-nginx.access-*',
      invalid: 'logs-nginx.error-*',
    },
    'observability-nginx-error-logs-data-source-profile': {
      valid: 'logs-nginx.error-*',
      invalid: 'logs-nginx.access-*',
    },
    'observability-system-logs-data-source-profile': {
      valid: 'logs-system.syslog-*',
      invalid: 'logs-notsystem.syslog-*',
    },
    'observability-windows-logs-data-source-profile': {
      valid: 'logs-windows.powershell-*',
      invalid: 'logs-notwindows.powershell-*',
    },
  };

  describe.each(providers)('$profileId', (provider) => {
    it('should match a valid index pattern', async () => {
      const result = await provider.resolve({
        rootContext: ROOT_CONTEXT,
        dataSource: createEsqlDataSource(),
        query: { esql: `FROM ${indexPatternMap[provider.profileId].valid}` },
      });
      expect(result).toEqual(RESOLUTION_MATCH);
    });

    it('should not match an invalid index pattern', async () => {
      const result = await provider.resolve({
        rootContext: ROOT_CONTEXT,
        dataSource: createEsqlDataSource(),
        query: { esql: `FROM ${indexPatternMap[provider.profileId].invalid}` },
      });
      expect(result).toEqual({ isMatch: false });
    });

    it('should return default app state', () => {
      const getDefaultAppState = provider.profile.getDefaultAppState?.(() => ({}), {
        context: RESOLUTION_MATCH.context,
      });
      expect(getDefaultAppState?.({ dataView: dataViewWithTimefieldMock })).toEqual({
        columns: expectedColumnsMap[provider.profileId],
      });
    });
  });
});
