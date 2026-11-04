/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { WorkflowTaskOutput } from '../types';
import {
  createEsqlExecutionEvaluator,
  createEsqlValidityEvaluator,
  toLimitZeroQuery,
} from './evaluators';
import { extractEsqlQueriesFromYaml, maskLiquidInEsql } from './extract_esql';

const output = (resultYaml?: string): WorkflowTaskOutput => ({
  messages: [],
  errors: [],
  resultYaml,
});

const run = (
  evaluator: ReturnType<typeof createEsqlValidityEvaluator>,
  resultYaml: string | undefined,
  expectsEsql = true
) =>
  evaluator.evaluate({
    input: {},
    output: output(resultYaml),
    expected: { expectsEsql },
    metadata: {},
  } as Parameters<typeof evaluator.evaluate>[0]);

const workflow = (...queries: string[]) =>
  [
    'name: test',
    'triggers:',
    '  - type: manual',
    'steps:',
    ...queries.flatMap((query, i) => [
      `  - name: q${i}`,
      '    type: elasticsearch.esql.query',
      '    with:',
      `      query: ${JSON.stringify(query)}`,
    ]),
  ].join('\n');

describe('maskLiquidInEsql', () => {
  it('replaces Liquid inside string literals with typed placeholders', () => {
    const { query, status } = maskLiquidInEsql(
      'FROM logs-* | WHERE host.name == "{{ inputs.host }}" AND @timestamp > "{{ inputs.start_time }}" AND source.ip == "{{ event.source_ip }}"'
    );
    expect(status).toBe('executable');
    expect(query).toBe(
      'FROM logs-* | WHERE host.name == "placeholder" AND @timestamp > "2025-01-01T00:00:00.000Z" AND source.ip == "127.0.0.1"'
    );
  });

  it('marks Liquid in a structural position as structural', () => {
    expect(maskLiquidInEsql('FROM {{ consts.index }} | LIMIT 10').status).toBe('structural');
    expect(maskLiquidInEsql('FROM logs-* | LIMIT {{ inputs.n }}').status).toBe('structural');
    expect(maskLiquidInEsql('FROM logs-* {% if x %}| LIMIT 1{% endif %}').status).toBe(
      'structural'
    );
  });

  it('marks an unclosed Liquid span as structural', () => {
    expect(maskLiquidInEsql('FROM logs-* | WHERE a == "{{ x"').status).toBe('structural');
  });

  it('ignores braces inside escaped quotes correctly', () => {
    const { status } = maskLiquidInEsql('FROM logs-* | WHERE a == "x\\"{{ y }}"');
    expect(status).toBe('executable');
  });
});

describe('extractEsqlQueriesFromYaml', () => {
  it('collects queries from top-level and nested steps', () => {
    const yaml = `
name: test
triggers:
  - type: manual
steps:
  - name: top
    type: elasticsearch.esql.query
    with:
      query: FROM logs-* | LIMIT 1
  - name: loop
    type: foreach
    foreach: "{{ steps.top.output.values }}"
    steps:
      - name: inner
        type: elasticsearch.esql.query
        with:
          query: 'FROM logs-* | WHERE user.name == "{{ foreach.item[0] }}"'
      - name: log
        type: console
        with:
          message: hi
`;
    const queries = extractEsqlQueriesFromYaml(yaml);
    expect(queries.map(({ stepName, status }) => [stepName, status])).toEqual([
      ['top', 'executable'],
      ['inner', 'executable'],
    ]);
    expect(queries[1].query).toBe('FROM logs-* | WHERE user.name == "placeholder"');
  });

  it('returns an empty list for invalid or missing YAML', () => {
    expect(extractEsqlQueriesFromYaml(undefined)).toEqual([]);
    expect(extractEsqlQueriesFromYaml('steps: [')).toEqual([]);
  });
});

describe('toLimitZeroQuery', () => {
  it('appends LIMIT 0 and strips a trailing semicolon', () => {
    expect(toLimitZeroQuery('FROM a | LIMIT 5;\n')).toBe('FROM a | LIMIT 5\n| LIMIT 0');
  });
});

describe('createEsqlValidityEvaluator', () => {
  const evaluator = createEsqlValidityEvaluator();

  it('scores the fraction of syntactically valid queries', async () => {
    const result = await run(evaluator, workflow('FROM logs-* | LIMIT 1', 'FROM logs-* | WHERE'));
    expect(result.score).toBe(0.5);
    expect(result.label).toBe('partial');
  });

  it('returns N/A when no ES|QL step exists and none is expected', async () => {
    const result = await run(evaluator, 'name: x\nsteps: []', false);
    expect(result.score).toBeNull();
  });

  it('scores 0 when an ES|QL step is expected but missing', async () => {
    const result = await run(evaluator, 'name: x\nsteps: []');
    expect(result.score).toBe(0);
  });

  it('does not penalize Liquid inside string literals', async () => {
    const result = await run(
      evaluator,
      workflow('FROM logs-* | WHERE host.name == "{{ inputs.host }}" | LIMIT 1')
    );
    expect(result.score).toBe(1);
  });

  it('returns N/A when every query has structural Liquid', async () => {
    const result = await run(evaluator, workflow('FROM {{ consts.idx }} | LIMIT 1'));
    expect(result.score).toBeNull();
  });
});

describe('createEsqlExecutionEvaluator', () => {
  it('runs each query with LIMIT 0 and scores accepted queries', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ columns: [], values: [] })
      .mockRejectedValueOnce(new Error('Unknown column [nope]'));
    const esClient = { esql: { query } } as unknown as EsClient;
    const evaluator = createEsqlExecutionEvaluator({ esClient });

    const result = await run(
      evaluator,
      workflow('FROM logs-* | KEEP host.name', 'FROM logs-* | KEEP nope')
    );

    expect(query).toHaveBeenCalledWith({ query: 'FROM logs-* | KEEP host.name\n| LIMIT 0' });
    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('Unknown column [nope]');
  });
});
