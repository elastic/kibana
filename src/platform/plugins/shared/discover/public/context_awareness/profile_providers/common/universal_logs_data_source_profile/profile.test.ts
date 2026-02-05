/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '../../../../__mocks__/data_view';
import { createContextAwarenessMocks } from '../../../../__mocks__/context_awareness_context';
import { createUniversalLogsDataSourceProfileProvider } from './profile';
import { DataSourceCategory, SolutionType } from '../../../profiles';

const { profileProviderServices } = createContextAwarenessMocks();

describe('universal_logs_data_source_profile', () => {
  const logsProfile = createUniversalLogsDataSourceProfileProvider(profileProviderServices);

  describe('resolve', () => {
    it('should match logs index patterns', () => {
      expect(
        logsProfile.resolve({
          dataView: dataViewMock,
          indexPattern: 'logs-*',
          query: { query: '', language: 'kuery' },
          rootContext: { solutionNavId: SolutionType.Default },
        })
      ).toEqual({
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      });
    });

    it('should match filebeat index patterns', () => {
      expect(
        logsProfile.resolve({
          dataView: dataViewMock,
          indexPattern: 'filebeat-*',
          query: { query: '', language: 'kuery' },
          rootContext: { solutionNavId: SolutionType.Default },
        })
      ).toEqual({
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      });
    });

    it('should not match when not a logs index pattern', () => {
      expect(
        logsProfile.resolve({
          dataView: dataViewMock,
          indexPattern: 'metrics-*',
          query: { query: '', language: 'kuery' },
          rootContext: { solutionNavId: SolutionType.Default },
        })
      ).toEqual({
        isMatch: false,
      });
    });

    it('should not match in ES3 (Elasticsearch serverless)', () => {
      expect(
        logsProfile.resolve({
          dataView: dataViewMock,
          indexPattern: 'logs-*',
          query: { query: '', language: 'kuery' },
          rootContext: { solutionNavId: 'es' },
        })
      ).toEqual({
        isMatch: false,
      });
    });

    it('should match in Security solution', () => {
      expect(
        logsProfile.resolve({
          dataView: dataViewMock,
          indexPattern: 'logs-*',
          query: { query: '', language: 'kuery' },
          rootContext: { solutionNavId: SolutionType.Security },
        })
      ).toEqual({
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      });
    });

    it('should match in Observability solution', () => {
      expect(
        logsProfile.resolve({
          dataView: dataViewMock,
          indexPattern: 'logs-*',
          query: { query: '', language: 'kuery' },
          rootContext: { solutionNavId: SolutionType.Observability },
        })
      ).toEqual({
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      });
    });

    it('should match in Search solution', () => {
      expect(
        logsProfile.resolve({
          dataView: dataViewMock,
          indexPattern: 'logs-*',
          query: { query: '', language: 'kuery' },
          rootContext: { solutionNavId: 'search' },
        })
      ).toEqual({
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      });
    });

    it('should match in Classic/Default context', () => {
      expect(
        logsProfile.resolve({
          dataView: dataViewMock,
          indexPattern: 'logs-*',
          query: { query: '', language: 'kuery' },
          rootContext: { solutionNavId: SolutionType.Default },
        })
      ).toEqual({
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      });
    });
  });

  describe('profile', () => {
    it('should provide all extension points', () => {
      expect(logsProfile.profile.getDefaultAppState).toBeDefined();
      expect(logsProfile.profile.getCellRenderers).toBeDefined();
      expect(logsProfile.profile.getRowIndicatorProvider).toBeDefined();
      expect(logsProfile.profile.getPaginationConfig).toBeDefined();
      expect(logsProfile.profile.getColumnsConfiguration).toBeDefined();
      expect(logsProfile.profile.getRecommendedFields).toBeDefined();
    });
  });
});
