/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEsqlDataSource } from '../../../../../common/data_sources';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { createMetricsDataSourceProfileProvider } from './profile';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../consts';
import type { RootContext } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import type { ContextWithProfileId } from '../../../profile_service';

const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
  profileId: OBSERVABILITY_ROOT_PROFILE_ID,
  solutionType: SolutionType.Observability,
};

const RESOLUTION_MATCH = {
  isMatch: true,
  context: {
    category: DataSourceCategory.Metrics,
  },
};

const RESOLUTION_MISMATCH = {
  isMatch: false,
};

describe('metricsDataSourceProfileProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should match profile when feature flag is enabled', async () => {
    const servicesMock = {
      core: {
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(true),
        },
      },
    } as unknown as ProfileProviderServices;

    const metricsDataSourceProfileProvider = createMetricsDataSourceProfileProvider(servicesMock);
    const dataSourceContext = await metricsDataSourceProfileProvider.resolve({
      rootContext: ROOT_CONTEXT,
      dataSource: createEsqlDataSource(),
      query: { esql: 'from my-example-metrics' },
    });

    expect(dataSourceContext).toEqual(RESOLUTION_MATCH);
  });

  it('should not match profile when feature flag is disabled', async () => {
    const servicesMock = {
      core: {
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(false),
        },
      },
    } as unknown as ProfileProviderServices;

    const metricsDataSourceProfileProvider = createMetricsDataSourceProfileProvider(servicesMock);
    const dataSourceContext = await metricsDataSourceProfileProvider.resolve({
      rootContext: ROOT_CONTEXT,
      dataSource: createEsqlDataSource(),
      query: { esql: 'from my-example-metrics' },
    });

    expect(dataSourceContext).toEqual(RESOLUTION_MISMATCH);
  });
});
