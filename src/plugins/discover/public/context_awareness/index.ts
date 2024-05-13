/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { AggregateQuery, isOfAggregateQueryType, Query } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { DataSourceType, DiscoverDataSource, isDataSourceType } from '../../common/data_sources';

export interface ContextProvider<TParams, TContext> {
  order: number;
  resolve: (params: TParams) => TContext | undefined;
}

export abstract class ContextService<TParams, TContext> {
  private providers: Array<ContextProvider<TParams, TContext>> = [];

  public registerProvider(provider: ContextProvider<TParams, TContext>) {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.order - b.order);
  }

  public resolve(params: TParams): TContext {
    for (const provider of this.providers) {
      const context = provider.resolve(params);

      if (context) {
        return context;
      }
    }

    return this.getDefaultContext();
  }

  protected abstract getDefaultContext(): TContext;
}

export enum SolutionType {
  Observability = 'oblt',
  Security = 'security',
  Search = 'search',
  Default = 'default',
}

export interface RootContext {
  solutionType: SolutionType;
}

export interface RootContextProviderParams {
  solutionNavId: string;
}

export type RootContextProvider = ContextProvider<RootContextProviderParams, RootContext>;

export class RootContextService extends ContextService<RootContextProviderParams, RootContext> {
  protected getDefaultContext(): RootContext {
    return {
      solutionType: SolutionType.Default,
    };
  }
}

export const rootContextService = new RootContextService();

rootContextService.registerProvider({
  order: 0,
  resolve: (params) => {
    if (params.solutionNavId === 'search') {
      return {
        solutionType: SolutionType.Search,
      };
    }
  },
});

rootContextService.registerProvider({
  order: 100,
  resolve: (params) => {
    if (params.solutionNavId === 'oblt') {
      return {
        solutionType: SolutionType.Observability,
      };
    }
  },
});

rootContextService.registerProvider({
  order: 200,
  resolve: (params) => {
    if (params.solutionNavId === 'security') {
      return {
        solutionType: SolutionType.Observability,
      };
    }
  },
});

export enum DataSourceCategory {
  Logs = 'logs',
  Default = 'default',
}

export interface DataSourceContext {
  category: DataSourceCategory;
}

export interface DataSourceContextProviderParams {
  dataSource: DiscoverDataSource;
  dataView: DataView;
  query: Query | AggregateQuery | undefined;
}

export type DataSourceContextProvider = ContextProvider<
  DataSourceContextProviderParams,
  DataSourceContext
>;

export class DataSourceContextService extends ContextService<
  DataSourceContextProviderParams,
  DataSourceContext
> {
  protected getDefaultContext(): DataSourceContext {
    return {
      category: DataSourceCategory.Default,
    };
  }
}

export const dataSourceContextService = new DataSourceContextService();

dataSourceContextService.registerProvider({
  order: 0,
  resolve: (params) => {
    let indices: string[] = [];

    if (isDataSourceType(params.dataSource, DataSourceType.Esql)) {
      if (!isOfAggregateQueryType(params.query)) {
        return;
      }

      indices = getIndexPatternFromESQLQuery(params.query.esql).split(',');
    } else if (isDataSourceType(params.dataSource, DataSourceType.DataView)) {
      indices = params.dataView.getIndexPattern().split(',');
    }

    if (indices.every((index) => index.startsWith('logs-'))) {
      return {
        category: DataSourceCategory.Logs,
      };
    }
  },
});

export enum DocumentType {
  Log = 'log',
  Default = 'default',
}

export interface DocumentContext {
  type: DocumentType;
}

export interface DocumentContextProviderParams {
  record: DataTableRecord;
}

export type DocumentContextProvider = ContextProvider<
  DocumentContextProviderParams,
  DocumentContext
>;

export class DocumentContextService extends ContextService<
  DocumentContextProviderParams,
  DocumentContext
> {
  protected getDefaultContext(): DocumentContext {
    return {
      type: DocumentType.Default,
    };
  }
}

export const documentContextService = new DocumentContextService();

documentContextService.registerProvider({
  order: 0,
  resolve: (params) => {
    if ('message' in params.record.flattened) {
      return {
        type: DocumentType.Log,
      };
    }
  },
});
