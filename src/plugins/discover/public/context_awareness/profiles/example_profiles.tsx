/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge } from '@elastic/eui';
import {
  DataTableRecord,
  getMessageFieldWithFallbacks,
  LogDocumentOverview,
} from '@kbn/discover-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import { capitalize } from 'lodash';
import React from 'react';
import { DataSourceType, isDataSourceType } from '../../../common/data_sources';
import {
  DataSourceCategory,
  DataSourceProfileProvider,
  dataSourceProfileService,
} from './data_source_profile';
import { DocumentProfileProvider, documentProfileService, DocumentType } from './document_profile';
import { RootProfileProvider, rootProfileService, SolutionType } from './root_profile';

export const o11yRootProfileProvider: RootProfileProvider = {
  order: 0,
  profile: {
    getTopNavItems: (prev) => () =>
      [
        {
          id: 'o11y-root-entry',
          label: 'O11y project entry',
          run: () => {
            alert('HELLO WORLD');
          },
        },
        ...prev(),
      ],
  },
  resolve: (params) => {
    if (params.solutionNavId === 'oblt') {
      return {
        isMatch: true,
        context: {
          solutionType: SolutionType.Observability,
        },
      };
    }

    return { isMatch: false };
  },
};

export const logsDataSourceProfileProvider: DataSourceProfileProvider = {
  order: 0,
  profile: {
    getTopNavItems: (prev) => () =>
      [
        {
          id: 'logs-data-source-entry',
          label: 'Logs data source entry',
          run: () => {
            alert('HELLO WORLD');
          },
        },
        ...prev(),
      ],
    getDefaultColumns: () => () => ({
      columns: ['@timestamp', 'log.level', 'message'],
      settings: {
        'log.level': {
          width: 120,
        },
      },
    }),
    getCellRenderers: (prev) => () => ({
      ...prev(),
      '@timestamp': (props) => {
        const timestamp = getFieldValue(props.row, '@timestamp');

        return (
          <EuiBadge color="hollow" title={timestamp}>
            {timestamp}
          </EuiBadge>
        );
      },
      'log.level': (props) => {
        const level = getFieldValue(props.row, 'log.level');

        if (!level) {
          return <span css={{ color: euiThemeVars.euiTextSubduedColor }}>(None)</span>;
        }

        const levelMap: Record<string, string> = {
          info: 'primary',
          debug: 'default',
          error: 'danger',
        };

        return (
          <EuiBadge color={levelMap[level]} title={level}>
            {capitalize(level)}
          </EuiBadge>
        );
      },
      message: (props) => {
        const { value } = getMessageFieldWithFallbacks(
          props.row.flattened as unknown as LogDocumentOverview
        );

        return value || <span css={{ color: euiThemeVars.euiTextSubduedColor }}>(None)</span>;
      },
    }),
  },
  resolve: (params) => {
    let indices: string[] = [];

    if (isDataSourceType(params.dataSource, DataSourceType.Esql)) {
      if (!isOfAggregateQueryType(params.query)) {
        return { isMatch: false };
      }

      indices = getIndexPatternFromESQLQuery(params.query.esql).split(',');
    } else if (isDataSourceType(params.dataSource, DataSourceType.DataView) && params.dataView) {
      indices = params.dataView.getIndexPattern().split(',');
    }

    if (indices.every((index) => index.startsWith('logs-'))) {
      return {
        isMatch: true,
        context: { category: DataSourceCategory.Logs },
      };
    }

    return { isMatch: false };
  },
};

export const logDocumentProfileProvider: DocumentProfileProvider = {
  order: 0,
  profile: {
    getDocViewsRegistry: (prev) => (registry) => {
      registry.enableById('doc_view_logs_overview');
      return prev(registry);
    },
  },
  resolve: (params) => {
    if (getFieldValue(params.record, 'data_stream.type') === 'logs') {
      return {
        isMatch: true,
        context: {
          type: DocumentType.Log,
        },
      };
    }

    return { isMatch: false };
  },
};

rootProfileService.registerProvider(o11yRootProfileProvider);
dataSourceProfileService.registerProvider(logsDataSourceProfileProvider);
documentProfileService.registerProvider(logDocumentProfileProvider);

const getFieldValue = (record: DataTableRecord, field: string) => {
  const value = record.flattened[field];
  return Array.isArray(value) ? value[0] : value;
};
