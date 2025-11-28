/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { DataSourceType } from '../../../../../common/data_sources';
import type { MetricsExperienceDataSourceProfileProvider } from './profile';
import { METRICS_DATA_SOURCE_PROFILE_ID, createMetricsDataSourceProfileProvider } from './profile';
import { createProfileProviderSharedServicesMock } from '../../../__mocks__';
import type { ContextWithProfileId } from '../../../profile_service';
import type { DataSourceProfileProviderParams, RootContext } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';

const mockServices = createProfileProviderSharedServicesMock();

const RESOLUTION_MATCH = {
  isMatch: true,
  context: { category: DataSourceCategory.Metrics },
};

const RESOLUTION_MISMATCH = {
  isMatch: false,
};

describe('metricsDataSourceProfileProvider', () => {
  const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
    profileId: METRICS_DATA_SOURCE_PROFILE_ID,
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

  let provider: MetricsExperienceDataSourceProfileProvider;

  const createProvider = () =>
    createMetricsDataSourceProfileProvider({
      ...mockServices,
    });

  describe('matches', () => {
    beforeEach(() => {
      provider = createProvider();
    });

    it.each([
      'TS metrics-*',
      'TS metrics-* | LIMIT 10',
      'TS metrics-* | SORT @timestamp DESC',
      'TS logs-* | LIMIT 5 | SORT @timestamp',
    ])('when query contains only supported commands: %s', async (query) => {
      const result = await provider.resolve(
        createParams({
          query: { esql: query },
          rootContext: { profileId: 'foo', solutionType: SolutionType.Observability },
        })
      );

      expect(result).toEqual(RESOLUTION_MATCH);
    });

    it.each([
      SolutionType.Observability,
      SolutionType.Security,
      SolutionType.Default,
      SolutionType.Search,
    ])('when SolutionType is %s', async (solutionType) => {
      const result = await provider.resolve(
        createParams({
          query: { esql: 'TS metrics-*' },
          rootContext: { profileId: 'foo', solutionType },
        })
      );

      expect(result).toEqual(RESOLUTION_MATCH);
    });
  });

  describe('does not match', () => {
    beforeEach(() => {
      provider = createProvider();
    });

    it('when query uses FROM command with metrics index', async () => {
      const result = await provider.resolve(createParams({ query: { esql: 'FROM metrics-*' } }));
      expect(result).toEqual(RESOLUTION_MISMATCH);
    });

    it('when query uses FROM command with mixed index patterns', async () => {
      const result = await provider.resolve(
        createParams({ query: { esql: 'FROM logs-*,metrics-*' } })
      );
      expect(result).toEqual(RESOLUTION_MISMATCH);
    });

    it.each([
      'FROM metrics-* | STATS count() BY @timestamp',
      'FROM metrics-* | WHERE host.name="foo"',
      'TS metrics-* | WHERE host.name="foo"',
      'TS metrics-* | STATS count() BY @timestamp',
    ])('when query contains commands that are not supported: %s', async (query) => {
      const result = await provider.resolve(
        createParams({
          query: { esql: query },
        })
      );

      expect(result).toEqual(RESOLUTION_MISMATCH);
    });
  });
});
