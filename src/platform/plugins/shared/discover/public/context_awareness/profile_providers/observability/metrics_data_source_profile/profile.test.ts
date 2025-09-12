/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DataSourceCategory,
  type DataSourceProfileProviderParams,
  SolutionType,
  type RootContext,
} from '../../../profiles';
import { DataSourceType } from '../../../../../common/data_sources';
import { createMetricsDataSourceProfileProvider } from './profile';
import { createContextAwarenessMocks } from '../../../__mocks__';
import type { ContextWithProfileId } from '../../../profile_service';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../consts';

const mockServices = createContextAwarenessMocks().profileProviderServices;

describe('metricsDataSourceProfileProvider', () => {
  const provider = createMetricsDataSourceProfileProvider(mockServices);

  const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
    profileId: OBSERVABILITY_ROOT_PROFILE_ID,
    solutionType: SolutionType.Observability,
  };

  const createParams = (
    overrides: Partial<DataSourceProfileProviderParams>
  ): DataSourceProfileProviderParams => ({
    rootContext: ROOT_CONTEXT,
    dataSource: { type: DataSourceType.Esql },
    query: { esql: '' },
    ...overrides,
  });

  describe('matches', () => {
    it('returns match when ES|QL query starts with FROM metrics-*', () => {
      const result = provider.resolve(createParams({ query: { esql: 'FROM metrics-*' } }));
      expect(result).toEqual({
        isMatch: true,
        context: { category: DataSourceCategory.Metrics },
      });
    });

    it('returns match when ES|QL query starts with TS metrics-*', () => {
      const result = provider.resolve(createParams({ query: { esql: 'TS metrics-*' } }));
      expect(result).toEqual({
        isMatch: true,
        context: { category: DataSourceCategory.Metrics },
      });
    });
  });

  describe('does not match', () => {
    it('when the query references non-metrics indices', () => {
      const result = provider.resolve(createParams({ query: { esql: 'FROM traces-*' } }));
      expect(result).toEqual({ isMatch: false });
    });

    it('when the metrics client is not initialized', () => {
      const providerWithoutMetrics = createMetricsDataSourceProfileProvider({
        ...mockServices,
        metricsContextService: {
          getMetricsExperienceClient: () => undefined,
        },
      });

      const result = providerWithoutMetrics.resolve(
        createParams({ query: { esql: 'FROM metrics-*' } })
      );
      expect(result).toEqual({ isMatch: false });
    });

    it('when the root solutionType is not Observability', () => {
      const result = provider.resolve(
        createParams({
          rootContext: {
            profileId: 'security-root-profile',
            solutionType: SolutionType.Security,
          },
        })
      );
      expect(result).toEqual({ isMatch: false });
    });
  });
});
