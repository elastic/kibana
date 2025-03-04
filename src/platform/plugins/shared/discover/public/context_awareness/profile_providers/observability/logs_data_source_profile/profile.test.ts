/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EuiThemeComputed } from '@elastic/eui';
import { createStubIndexPattern } from '@kbn/data-views-plugin/common/data_view.stub';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../../common/data_sources';
import {
  DataSourceCategory,
  DataSourceProfileProviderParams,
  RootContext,
  SolutionType,
} from '../../../profiles';
import { createContextAwarenessMocks } from '../../../__mocks__';
import { createLogsDataSourceProfileProvider } from './profile';
import { DataGridDensity } from '@kbn/unified-data-table';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import type { ContextWithProfileId } from '../../../profile_service';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../consts';

const mockServices = createContextAwarenessMocks().profileProviderServices;

describe('logsDataSourceProfileProvider', () => {
  const logsDataSourceProfileProvider = createLogsDataSourceProfileProvider(mockServices);

  const VALID_IMPLICIT_DATA_INDEX_PATTERN = 'logs-nginx.access-*';
  const VALID_INDEX_PATTERNS: Array<[string, string]> = [
    ['explicit data', 'logs-nginx.access-*::data'],
    ['implicit data', VALID_IMPLICIT_DATA_INDEX_PATTERN],
    ['mixed data selector qualification', 'logs-nginx.access-*::data,logs-nginx.error-*'],
  ];
  const INVALID_INDEX_PATTERNS: Array<[string, string]> = [
    ['forbidden implicit data', 'my_source-access-*'],
    ['mixed implicit data', 'logs-nginx.access-*,metrics-*'],
    ['mixed explicit data', 'logs-nginx.access-*::data,metrics-*::data'],
    ['mixed selector', 'logs-nginx.access-*,logs-nginx.access-*::failures'],
  ];

  const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
    profileId: OBSERVABILITY_ROOT_PROFILE_ID,
    solutionType: SolutionType.Observability,
  };
  const RESOLUTION_MATCH = {
    isMatch: true,
    context: { category: DataSourceCategory.Logs },
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  it.each(VALID_INDEX_PATTERNS)(
    'should match ES|QL sources with an allowed %s index pattern in its query',
    (_, validIndexPattern) => {
      expect(
        logsDataSourceProfileProvider.resolve({
          rootContext: ROOT_CONTEXT,
          dataSource: createEsqlDataSource(),
          query: { esql: `from ${validIndexPattern}` },
        })
      ).toEqual(RESOLUTION_MATCH);
    }
  );

  it.each(INVALID_INDEX_PATTERNS)(
    'should NOT match ES|QL sources with a %s index pattern in its query',
    (_, invalidIndexPattern) => {
      expect(
        logsDataSourceProfileProvider.resolve({
          rootContext: ROOT_CONTEXT,
          dataSource: createEsqlDataSource(),
          query: { esql: `from ${invalidIndexPattern}` },
        })
      ).toEqual(RESOLUTION_MISMATCH);
    }
  );

  it.each(VALID_INDEX_PATTERNS)(
    'should match data view sources with an allowed %s index pattern',
    (_, validIndexPattern) => {
      expect(
        logsDataSourceProfileProvider.resolve({
          rootContext: ROOT_CONTEXT,
          dataSource: createDataViewDataSource({ dataViewId: validIndexPattern }),
          dataView: createStubIndexPattern({ spec: { title: validIndexPattern } }),
        })
      ).toEqual(RESOLUTION_MATCH);
    }
  );

  it.each(INVALID_INDEX_PATTERNS)(
    'should NOT match data view sources with a %s index pattern',
    (_, invalidIndexPattern) => {
      expect(
        logsDataSourceProfileProvider.resolve({
          rootContext: ROOT_CONTEXT,
          dataSource: createDataViewDataSource({ dataViewId: invalidIndexPattern }),
          dataView: createStubIndexPattern({ spec: { title: invalidIndexPattern } }),
        })
      ).toEqual(RESOLUTION_MISMATCH);
    }
  );

  it('does NOT match data view sources when solution type is not Observability', () => {
    const params: Omit<DataSourceProfileProviderParams, 'rootContext'> = {
      dataSource: createEsqlDataSource(),
      query: { esql: `from ${VALID_IMPLICIT_DATA_INDEX_PATTERN}` },
    };
    expect(logsDataSourceProfileProvider.resolve({ ...params, rootContext: ROOT_CONTEXT })).toEqual(
      RESOLUTION_MATCH
    );
    expect(
      logsDataSourceProfileProvider.resolve({
        ...params,
        rootContext: { profileId: 'other-root-profile', solutionType: SolutionType.Default },
      })
    ).toEqual(RESOLUTION_MISMATCH);
    expect(
      logsDataSourceProfileProvider.resolve({
        ...params,
        rootContext: { profileId: 'other-root-profile', solutionType: SolutionType.Search },
      })
    ).toEqual(RESOLUTION_MISMATCH);
    expect(
      logsDataSourceProfileProvider.resolve({
        ...params,
        rootContext: { profileId: 'other-root-profile', solutionType: SolutionType.Security },
      })
    ).toEqual(RESOLUTION_MISMATCH);
  });

  const dataViewWithLogLevel = createStubIndexPattern({
    spec: {
      title: VALID_IMPLICIT_DATA_INDEX_PATTERN,
      fields: {
        'log.level': {
          name: 'log.level',
          type: 'string',
          esTypes: ['keyword'],
          aggregatable: true,
          searchable: true,
          count: 0,
          readFromDocValues: false,
          scripted: false,
          isMapped: true,
        },
      },
    },
  });

  const dataViewWithoutLogLevel = createStubIndexPattern({
    spec: {
      title: VALID_IMPLICIT_DATA_INDEX_PATTERN,
    },
  });

  describe('getRowIndicator', () => {
    it('should return the correct color for a given log level', () => {
      const row = buildDataTableRecord({ fields: { 'log.level': 'info' } });
      const euiTheme = { euiTheme: { colors: {} } } as unknown as EuiThemeComputed;
      const getRowIndicatorProvider =
        logsDataSourceProfileProvider.profile.getRowIndicatorProvider?.(() => undefined, {
          context: { category: DataSourceCategory.Logs },
        });
      const getRowIndicator = getRowIndicatorProvider?.({
        dataView: dataViewWithLogLevel,
      });

      expect(getRowIndicator).toBeDefined();
      expect(getRowIndicator?.(row, euiTheme)).toEqual({ color: '#90bdff', label: 'Info' });
    });

    it('should not return a color for a missing log level in the document', () => {
      const row = buildDataTableRecord({ fields: { other: 'info' } });
      const euiTheme = { euiTheme: { colors: {} } } as unknown as EuiThemeComputed;
      const getRowIndicatorProvider =
        logsDataSourceProfileProvider.profile.getRowIndicatorProvider?.(() => undefined, {
          context: { category: DataSourceCategory.Logs },
        });
      const getRowIndicator = getRowIndicatorProvider?.({
        dataView: dataViewWithLogLevel,
      });

      expect(getRowIndicator).toBeDefined();
      expect(getRowIndicator?.(row, euiTheme)).toBe(undefined);
    });

    it('should not set the color indicator handler if data view does not have log level field', () => {
      const getRowIndicatorProvider =
        logsDataSourceProfileProvider.profile.getRowIndicatorProvider?.(() => undefined, {
          context: { category: DataSourceCategory.Logs },
        });
      const getRowIndicator = getRowIndicatorProvider?.({
        dataView: dataViewWithoutLogLevel,
      });

      expect(getRowIndicator).toBeUndefined();
    });
  });

  describe('getCellRenderers', () => {
    it('should return cell renderers for log level fields', () => {
      const getCellRenderers = logsDataSourceProfileProvider.profile.getCellRenderers?.(
        () => ({}),
        {
          context: { category: DataSourceCategory.Logs },
        }
      );
      const getCellRenderersParams = {
        actions: { addFilter: jest.fn() },
        dataView: dataViewWithTimefieldMock,
        density: DataGridDensity.COMPACT,
        rowHeight: 0,
      };
      const cellRenderers = getCellRenderers?.(getCellRenderersParams);

      expect(cellRenderers).toBeDefined();
      expect(cellRenderers?.['log.level']).toBeDefined();
      expect(cellRenderers?.['log.level.keyword']).toBeDefined();
      expect(cellRenderers?.log_level).toBeDefined();
      expect(cellRenderers?.['log_level.keyword']).toBeDefined();
    });
  });

  describe('getRowAdditionalLeadingControls', () => {
    it('should return the passed additional controls', () => {
      const getRowAdditionalLeadingControls =
        logsDataSourceProfileProvider.profile.getRowAdditionalLeadingControls?.(() => undefined, {
          context: { category: DataSourceCategory.Logs },
        });
      const rowAdditionalLeadingControls = getRowAdditionalLeadingControls?.({
        dataView: dataViewWithLogLevel,
      });

      expect(rowAdditionalLeadingControls).toHaveLength(2);
      expect(rowAdditionalLeadingControls?.[0].id).toBe('connectedDegradedDocs');
      expect(rowAdditionalLeadingControls?.[1].id).toBe('connectedStacktraceDocs');
    });
  });
});
