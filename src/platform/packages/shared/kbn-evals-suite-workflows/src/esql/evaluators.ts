/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { validateQuery } from '@kbn/esql-language';
import type { Evaluator, EvaluationResult, Example } from '@kbn/evals';
import type { EsqlExpectations, WorkflowTaskOutput } from '../types';
import type { ExtractedEsqlQuery } from './extract_esql';
import { extractEsqlQueriesFromYaml } from './extract_esql';

export const ESQL_VALIDITY_EVALUATOR_NAME = 'EsqlValidity';
export const ESQL_EXECUTION_EVALUATOR_NAME = 'EsqlExecution';

interface QueryResult {
  stepName: string;
  query: string;
  ok: boolean;
  error?: string;
}

const NA = (explanation: string): EvaluationResult => ({ score: null, label: 'N/A', explanation });

const errorText = (error: unknown): string => {
  if (error && typeof error === 'object') {
    if ('text' in error) return String((error as { text: unknown }).text);
    if ('message' in error) return String((error as { message: unknown }).message);
  }
  return String(error);
};

const oneLine = (text: string, max = 160): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 3)}...`;
};

/**
 * Appends `| LIMIT 0` so the query is planned and resolved (indices, fields,
 * types) without returning rows. A trailing `LIMIT n` stays valid because a
 * second `LIMIT` is allowed.
 */
export const toLimitZeroQuery = (query: string): string =>
  `${query.trimEnd().replace(/;+$/, '')}\n| LIMIT 0`;

const scoreQueries = (
  name: string,
  results: QueryResult[],
  skipped: ExtractedEsqlQuery[]
): EvaluationResult => {
  const passed = results.filter(({ ok }) => ok).length;
  const failed = results.filter(({ ok }) => !ok);
  const score = passed / results.length;
  const explanation = [
    `${passed}/${results.length} ES|QL queries passed ${name}.`,
    ...failed.map(({ stepName, query, error }) => `• ${stepName}: ${error} — "${oneLine(query)}"`),
    ...(skipped.length > 0
      ? [
          `Not scored (Liquid in a structural position): ${skipped
            .map((q) => q.stepName)
            .join(', ')}`,
        ]
      : []),
  ].join('\n');

  return {
    score,
    label: score === 1 ? 'pass' : score === 0 ? 'fail' : 'partial',
    explanation,
    metadata: { total: results.length, passed, skipped: skipped.length, queries: results },
  };
};

const createEsqlEvaluator = <TExample extends Example>(
  name: string,
  checkQuery: (query: string) => Promise<string | undefined>
): Evaluator<TExample, WorkflowTaskOutput> => ({
  name,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { expectsEsql } = (expected ?? {}) as EsqlExpectations;
    const extracted = extractEsqlQueriesFromYaml(output?.resultYaml);

    if (extracted.length === 0) {
      if (!expectsEsql) return NA('No elasticsearch.esql.query step in the output.');
      return {
        score: 0,
        label: 'no-queries',
        explanation: output?.resultYaml
          ? 'The example expects an elasticsearch.esql.query step, but the workflow has none.'
          : 'No workflow YAML was produced.',
      };
    }

    const executable = extracted.filter(({ status }) => status === 'executable');
    const skipped = extracted.filter(({ status }) => status === 'structural');
    if (executable.length === 0) {
      return NA('Every ES|QL query uses Liquid in a structural position, so none can be scored.');
    }

    const results = await Promise.all(
      executable.map(async ({ stepName, query }): Promise<QueryResult> => {
        if (query.trim().length === 0) {
          return { stepName, query, ok: false, error: 'Empty query' };
        }
        const error = await checkQuery(query);
        return { stepName, query, ok: error === undefined, error };
      })
    );

    return scoreQueries(name, results, skipped);
  },
});

/**
 * Parses each ES|QL step query with `@kbn/esql-language`. Score = fraction of
 * queries with no syntax error. No cluster access.
 */
export const createEsqlValidityEvaluator = <TExample extends Example>(): Evaluator<
  TExample,
  WorkflowTaskOutput
> =>
  createEsqlEvaluator<TExample>(ESQL_VALIDITY_EVALUATOR_NAME, async (query) => {
    const { errors } = await validateQuery(query);
    return errors.length === 0 ? undefined : errors.map(errorText).join('; ');
  });

/**
 * Runs each ES|QL step query with `LIMIT 0` against the fixture indices.
 * Catches unknown indices, unknown columns and type errors. Score = fraction
 * of queries that Elasticsearch accepts.
 */
export const createEsqlExecutionEvaluator = <TExample extends Example>({
  esClient,
}: {
  esClient: EsClient;
}): Evaluator<TExample, WorkflowTaskOutput> =>
  createEsqlEvaluator<TExample>(ESQL_EXECUTION_EVALUATOR_NAME, async (query) => {
    try {
      await esClient.esql.query({ query: toLimitZeroQuery(query) });
      return undefined;
    } catch (error) {
      return errorText(error);
    }
  });
