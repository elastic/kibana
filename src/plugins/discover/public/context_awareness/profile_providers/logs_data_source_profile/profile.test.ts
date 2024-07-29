/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EuiThemeComputed } from '@elastic/eui';
import { createStubIndexPattern } from '@kbn/data-views-plugin/common/data_view.stub';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../common/data_sources';
import { DataSourceCategory } from '../../profiles';
import { createContextAwarenessMocks } from '../../__mocks__';
import { createLogsDataSourceProfileProvider } from './profile';

const mockServices = createContextAwarenessMocks().profileProviderServices;

describe('logsDataSourceProfileProvider', () => {
  const logsDataSourceProfileProvider = createLogsDataSourceProfileProvider(mockServices);
  const VALID_INDEX_PATTERN = 'logs-nginx.access-*';
  const MIXED_INDEX_PATTERN = 'logs-nginx.access-*,metrics-*';
  const INVALID_INDEX_PATTERN = 'my_source-access-*';

  const RESOLUTION_MATCH = {
    isMatch: true,
    context: { category: DataSourceCategory.Logs },
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  it('should match ES|QL sources with an allowed index pattern in its query', () => {
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createEsqlDataSource(),
        query: { esql: `from ${VALID_INDEX_PATTERN}` },
      })
    ).toEqual(RESOLUTION_MATCH);
  });

  it('should NOT match ES|QL sources with a mixed or not allowed index pattern in its query', () => {
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createEsqlDataSource(),
        query: { esql: `from ${INVALID_INDEX_PATTERN}` },
      })
    ).toEqual(RESOLUTION_MISMATCH);
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createEsqlDataSource(),
        query: { esql: `from ${MIXED_INDEX_PATTERN}` },
      })
    ).toEqual(RESOLUTION_MISMATCH);
  });

  it('should match data view sources with an allowed index pattern', () => {
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createDataViewDataSource({ dataViewId: VALID_INDEX_PATTERN }),
        dataView: createStubIndexPattern({ spec: { title: VALID_INDEX_PATTERN } }),
      })
    ).toEqual(RESOLUTION_MATCH);
  });

  it('should NOT match data view sources with a mixed or not allowed index pattern', () => {
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createDataViewDataSource({ dataViewId: INVALID_INDEX_PATTERN }),
        dataView: createStubIndexPattern({ spec: { title: INVALID_INDEX_PATTERN } }),
      })
    ).toEqual(RESOLUTION_MISMATCH);
    expect(
      logsDataSourceProfileProvider.resolve({
        dataSource: createDataViewDataSource({ dataViewId: MIXED_INDEX_PATTERN }),
        dataView: createStubIndexPattern({ spec: { title: MIXED_INDEX_PATTERN } }),
      })
    ).toEqual(RESOLUTION_MISMATCH);
  });

  const dataViewWithLogLevel = createStubIndexPattern({
    spec: {
      title: VALID_INDEX_PATTERN,
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
      title: VALID_INDEX_PATTERN,
    },
  });

  describe('getRowIndicator', () => {
    it('should return the correct color for a given log level', () => {
      const row = buildDataTableRecord({ fields: { 'log.level': 'info' } });
      const euiTheme = { euiTheme: { colors: {} } } as unknown as EuiThemeComputed;
      const getRowIndicatorProvider =
        logsDataSourceProfileProvider.profile.getRowIndicatorProvider?.(() => undefined);
      const getRowIndicator = getRowIndicatorProvider?.({
        dataView: dataViewWithLogLevel,
      });

      expect(getRowIndicator).toBeDefined();
      expect(getRowIndicator?.(row, euiTheme)).toEqual({ color: '#90b0d1', label: 'Info' });
    });

    it('should not return a color for a missing log level in the document', () => {
      const row = buildDataTableRecord({ fields: { other: 'info' } });
      const euiTheme = { euiTheme: { colors: {} } } as unknown as EuiThemeComputed;
      const getRowIndicatorProvider =
        logsDataSourceProfileProvider.profile.getRowIndicatorProvider?.(() => undefined);
      const getRowIndicator = getRowIndicatorProvider?.({
        dataView: dataViewWithLogLevel,
      });

      expect(getRowIndicator).toBeDefined();
      expect(getRowIndicator?.(row, euiTheme)).toBe(undefined);
    });

    it('should not set the color indicator handler if data view does not have log level field', () => {
      const getRowIndicatorProvider =
        logsDataSourceProfileProvider.profile.getRowIndicatorProvider?.(() => undefined);
      const getRowIndicator = getRowIndicatorProvider?.({
        dataView: dataViewWithoutLogLevel,
      });

      expect(getRowIndicator).toBeUndefined();
    });
  });

  describe('getCellRenderers', () => {
    it('should return cell renderers for log level fields', () => {
      const getCellRenderers = logsDataSourceProfileProvider.profile.getCellRenderers?.(() => ({}));
      const cellRenderers = getCellRenderers?.();

      expect(cellRenderers).toBeDefined();
      expect(cellRenderers?.['log.level']).toBeDefined();
      expect(cellRenderers?.['log.level.keyword']).toBeDefined();
      expect(cellRenderers?.log_level).toBeDefined();
      expect(cellRenderers?.['log_level.keyword']).toBeDefined();
    });
  });
});
