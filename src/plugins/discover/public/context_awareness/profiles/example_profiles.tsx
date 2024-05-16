/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
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
    getCellRenderers: (prev) => () => ({
      ...prev(),
      ['@timestamp']: (props) => {
        const date = new Date((props.row.flattened['@timestamp'] as string[])[0]);

        return (
          <>
            <span style={{ color: 'red' }}>{date.getFullYear()}</span>-
            <span style={{ color: 'green' }}>{date.getMonth() + 1}</span>-
            <span style={{ color: 'blue' }}>{date.getDate()}</span>{' '}
            <span style={{ color: 'purple' }}>
              {date.getHours()}:{date.getMinutes()}:{date.getSeconds()}
            </span>
          </>
        );
      },
      timestamp: (props) => {
        const date = new Date((props.row.flattened['@timestamp'] as string[])[0]);

        return (
          <>
            <span style={{ color: 'red' }}>{date.getFullYear()}</span>-
            <span style={{ color: 'green' }}>{date.getMonth() + 1}</span>-
            <span style={{ color: 'blue' }}>{date.getDate()}</span>{' '}
            <span style={{ color: 'purple' }}>
              {date.getHours()}:{date.getMinutes()}:{date.getSeconds()}
            </span>
          </>
        );
      },
      message: (props) => {
        const message = (props.row.flattened.message as string[])[0];

        return (
          <div style={{ border: '1px solid #c1c1c1', padding: '2px', borderRadius: '4px' }}>
            {message}
          </div>
        );
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

    if (indices.every((index) => index.includes('logs'))) {
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
    if ('message' in params.record.flattened && params.record.flattened.message != null) {
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
