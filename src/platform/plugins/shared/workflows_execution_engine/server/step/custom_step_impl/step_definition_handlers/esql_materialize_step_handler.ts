/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Logger } from '@kbn/logging';
import type { RunStepResult } from '../../node_implementation';
import type { CustomStepDefinitionHandler } from '../types';

/**
 * Handler for `elasticsearch.esql.materialize` steps.
 *
 * Runs an ES|QL query against a source view and persists the results
 * to a target index as individual documents. Designed for scheduled
 * snapshot/trend use cases.
 */
export class EsqlMaterializeStepHandler implements CustomStepDefinitionHandler {
  constructor(private logger: Logger) {}

  public async run(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<RunStepResult> {
    const stepWith = (config.with ?? config) as {
      query: string;
      target_index: string;
      id?: string;
      filter?: Record<string, unknown>[];
    };

    if (!stepWith.query) {
      throw new Error('elasticsearch.esql.materialize requires a "query" parameter');
    }
    if (!stepWith.target_index) {
      throw new Error('elasticsearch.esql.materialize requires a "target_index" parameter');
    }

    this.logger.info(`ES|QL materialize: querying to index "${stepWith.target_index}"`);

    // Get ES client from config (injected by the step runtime)
    const esClient = (config as any).esClient;
    if (!esClient) {
      throw new Error('elasticsearch.esql.materialize requires an Elasticsearch client');
    }

    // Step 1: Run the ES|QL query
    const queryResponse = await esClient.transport.request({
      method: 'POST',
      path: '/_query',
      body: {
        query: stepWith.query,
        format: 'json',
        ...(stepWith.filter ? { filter: stepWith.filter } : {}),
      },
    });

    const rows = (queryResponse as any)?.values ?? [];
    const columns = (queryResponse as any)?.columns ?? [];

    if (rows.length === 0) {
      this.logger.info('ES|QL materialize: query returned 0 rows, nothing to index');
      return { input: config, output: { indexed: 0, total: 0 }, error: undefined };
    }

    // Step 2: Build bulk body for indexing results
    const bulkBody: unknown[] = [];
    for (let i = 0; i < rows.length; i++) {
      const doc: Record<string, unknown> = {};
      for (let j = 0; j < columns.length; j++) {
        doc[columns[j].name] = rows[i][j];
      }

      const docId = stepWith.id ? `${stepWith.id}-${i}` : undefined;
      bulkBody.push({
        index: {
          _index: stepWith.target_index,
          ...(docId ? { _id: docId } : {}),
        },
      });
      bulkBody.push(doc);
    }

    // Step 3: Bulk index to target
    const bulkResponse = await esClient.bulk({ body: bulkBody });

    const failedItems = (bulkResponse.items ?? []).filter((item: any) =>
      Object.values(item).some((op: any) => op?.error != null)
    );

    if (failedItems.length > 0) {
      this.logger.warn(
        `ES|QL materialize: ${failedItems.length} of ${rows.length} documents failed to index`
      );
    } else {
      this.logger.info(
        `ES|QL materialize: indexed ${rows.length} documents to "${stepWith.target_index}"`
      );
    }

    return {
      input: config,
      output: {
        indexed: rows.length - failedItems.length,
        failed: failedItems.length,
        total: rows.length,
        errors: failedItems.length > 0,
        items: bulkResponse.items,
      },
      error: undefined,
    };
  }

  public async onCancel(
    input: unknown,
    rawInput: unknown,
    config: Record<string, unknown>
  ): Promise<void> {
    this.logger.info('ES|QL materialize: step cancelled');
  }
}
