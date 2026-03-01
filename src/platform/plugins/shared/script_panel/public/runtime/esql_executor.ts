/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pluck } from 'rxjs';
import type { Datatable, ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Filter, TimeRange, Query, AggregateQuery } from '@kbn/es-query';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import { textBasedQueryStateToAstWithValidation } from '@kbn/data-plugin/common';
import type { EsqlQueryParams, EsqlQueryResult, SandboxConfig, DashboardContext } from './types';
import { DEFAULT_SANDBOX_CONFIG } from './types';

interface EsqlErrorResponse {
  error: {
    message: string;
  };
  type: 'error';
}

export interface EsqlExecutorDependencies {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
}

export interface EsqlExecutorOptions {
  deps: EsqlExecutorDependencies;
  config?: Partial<SandboxConfig>;
  getContext?: () => DashboardContext;
}

/**
 * Handles ES|QL query execution for the script panel with context integration,
 * rate limiting, and guardrails.
 */
export class EsqlExecutor {
  private deps: EsqlExecutorDependencies;
  private config: SandboxConfig;
  private getContext?: () => DashboardContext;
  private activeQueries = new Set<AbortController>();

  constructor(options: EsqlExecutorOptions) {
    this.deps = options.deps;
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...options.config };
    this.getContext = options.getContext;
  }

  /**
   * Execute an ES|QL query with optional dashboard context integration.
   */
  async query(params: EsqlQueryParams): Promise<EsqlQueryResult> {
    this.validateQuery(params.query);

    if (this.activeQueries.size >= this.config.maxConcurrentQueries) {
      throw new Error(
        `Maximum concurrent queries (${this.config.maxConcurrentQueries}) exceeded. Please wait for previous queries to complete.`
      );
    }

    const abortController = new AbortController();
    this.activeQueries.add(abortController);

    try {
      const result = await this.executeQuery(params, abortController);
      return result;
    } finally {
      this.activeQueries.delete(abortController);
    }
  }

  /**
   * Cancel all active queries.
   */
  cancel(): void {
    for (const controller of this.activeQueries) {
      controller.abort('Query cancelled');
    }
    this.activeQueries.clear();
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.cancel();
  }

  private validateQuery(query: string): void {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    if (query.length > this.config.maxQueryLength) {
      throw new Error(`Query exceeds maximum length of ${this.config.maxQueryLength} characters`);
    }

    // Basic sanity check - ES|QL doesn't have DELETE/UPDATE but check anyway
    const upperQuery = query.toUpperCase().trim();
    const dangerousPatterns = ['DELETE', 'UPDATE', 'INSERT', 'DROP', 'ALTER', 'CREATE'];
    for (const pattern of dangerousPatterns) {
      if (upperQuery.startsWith(pattern)) {
        throw new Error(`Query contains disallowed operation: ${pattern}`);
      }
    }
  }

  private async executeQuery(
    params: EsqlQueryParams,
    abortController: AbortController
  ): Promise<EsqlQueryResult> {
    const { query, useContext = true } = params;

    const context = useContext ? this.getContext?.() : undefined;

    const esqlQuery: AggregateQuery = { esql: query };

    const timeRange: TimeRange | undefined = context?.timeRange
      ? { from: context.timeRange.from, to: context.timeRange.to }
      : undefined;

    const filters: Filter[] | undefined = context?.filters as Filter[] | undefined;

    const inputQuery: Query | undefined = context?.query ? (context.query as Query) : undefined;

    const ast = await textBasedQueryStateToAstWithValidation({
      query: esqlQuery,
      inputQuery,
      filters,
      time: timeRange ?? this.deps.data.query.timefilter.timefilter.getAbsoluteTime(),
    });

    if (!ast) {
      throw new Error('Failed to build query expression');
    }

    const contract = this.deps.expressions.execute(ast, null, {
      searchContext: {
        timeRange,
      },
    });

    abortController.signal.addEventListener('abort', () => {
      contract.cancel(AbortReason.CANCELED);
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        abortController.abort('Query timeout');
        reject(new Error(`Query timeout after ${this.config.queryTimeout}ms`));
      }, this.config.queryTimeout);
    });

    const execution = contract.getData();
    let result: Datatable | undefined;
    let error: string | undefined;

    const resultPromise = new Promise<EsqlQueryResult>((resolve, reject) => {
      execution.pipe(pluck('result')).subscribe({
        next: (resp) => {
          const response = resp as Datatable | EsqlErrorResponse;
          if (response && response.type === 'error') {
            error = (response as EsqlErrorResponse).error.message;
          } else {
            result = response as Datatable;
          }
        },
        error: (err) => reject(err),
        complete: () => {
          if (error) {
            reject(new Error(error));
          } else if (result) {
            resolve(this.formatResult(result));
          } else {
            resolve({
              columns: [],
              rows: [],
              rowCount: 0,
            });
          }
        },
      });
    });

    try {
      return await Promise.race([resultPromise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private formatResult(datatable: Datatable): EsqlQueryResult {
    const columns = datatable.columns.map((col) => ({
      name: col.name,
      type: col.meta?.type || 'unknown',
    }));

    // Apply row limit
    const rows = datatable.rows.slice(0, this.config.maxRows);
    const truncated = datatable.rows.length > this.config.maxRows;

    return {
      columns,
      rows,
      rowCount: rows.length,
      warning: truncated
        ? `Results truncated to ${this.config.maxRows} rows (${datatable.rows.length} total)`
        : datatable.warning,
    };
  }
}

/**
 * Factory function to create an ES|QL executor instance.
 */
export const createEsqlExecutor = (options: EsqlExecutorOptions): EsqlExecutor => {
  return new EsqlExecutor(options);
};
