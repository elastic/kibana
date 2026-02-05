/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createStubIndexPattern } from '@kbn/data-views-plugin/common/data_view.stub';
import { createUniversalLogsDataSourceProfileProvider } from './profile';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import { createProfileProviderSharedServicesMock } from '../../../__mocks__';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../../common/data_sources';

const mockServices = createProfileProviderSharedServicesMock();

describe('universal_logs_data_source_profile', () => {
  const logsProfile = createUniversalLogsDataSourceProfileProvider(mockServices);

  describe('resolve', () => {
    it('should match ES|QL queries with logs index patterns', () => {
      expect(
        logsProfile.resolve({
          rootContext: { solutionType: SolutionType.Default },
          dataSource: createEsqlDataSource(),
          query: { esql: 'FROM logs-*' },
        })
      ).toEqual({
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      });
    });

    it('should match data views with logs index patterns', () => {
      const stubDataView = createStubIndexPattern({
        spec: {
          id: 'logs-test',
          title: 'logs-*',
        },
      });

      expect(
        logsProfile.resolve({
          rootContext: { solutionType: SolutionType.Default },
          dataSource: createDataViewDataSource({ dataViewId: stubDataView.id! }),
          dataView: stubDataView,
        })
      ).toEqual({
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      });
    });

    it('should match filebeat index patterns', () => {
      expect(
        logsProfile.resolve({
          rootContext: { solutionType: SolutionType.Default },
          dataSource: createEsqlDataSource(),
          query: { esql: 'FROM filebeat-*' },
        })
      ).toEqual({
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      });
    });

    it('should not match when not a logs index pattern', () => {
      expect(
        logsProfile.resolve({
          rootContext: { solutionType: SolutionType.Default },
          dataSource: createEsqlDataSource(),
          query: { esql: 'FROM metrics-*' },
        })
      ).toEqual({
        isMatch: false,
      });
    });

    it('should match in all solution contexts', () => {
      const testCases = [
        { context: SolutionType.Security, label: 'Security' },
        { context: SolutionType.Observability, label: 'Observability' },
        { context: SolutionType.Default, label: 'Default' },
        { context: 'search' as const, label: 'Search' },
        { context: 'es' as const, label: 'ES3' },
      ];

      testCases.forEach(({ context, label }) => {
        expect(
          logsProfile.resolve({
            rootContext: { solutionType: context },
            dataSource: createEsqlDataSource(),
            query: { esql: 'FROM logs-*' },
          })
        ).toEqual({
          isMatch: true,
          context: { category: DataSourceCategory.Logs },
        });
      });
    });
  });

  describe('profile', () => {
    it('should provide all extension points', () => {
      expect(logsProfile.profile.getDefaultAppState).toBeDefined();
      expect(logsProfile.profile.getCellRenderers).toBeDefined();
      expect(logsProfile.profile.getRowIndicatorProvider).toBeDefined();
      expect(logsProfile.profile.getRowAdditionalLeadingControls).toBeDefined();
      expect(logsProfile.profile.getPaginationConfig).toBeDefined();
      expect(logsProfile.profile.getColumnsConfiguration).toBeDefined();
      expect(logsProfile.profile.getRecommendedFields).toBeDefined();
      // Note: getDocViewer is implemented in the companion document profile
    });

    it('should configure infinite scroll pagination', () => {
      const paginationConfig = logsProfile.profile.getPaginationConfig?.(() => ({}))(
        {} as any
      );
      expect(paginationConfig?.paginationMode).toBe('infinite');
    });
  });
});
