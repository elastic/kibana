/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Drives the real `@kbn/esql-language` validator, so these tests pin what an
// agent sees from `validate_workflow` for a given step.

import type { ESQLCallbacks } from '@kbn/esql-types';
import { collectEsqlDiagnostics } from './collect_esql_diagnostics';
import { MAX_VALIDATED_ESQL_QUERY_LENGTH } from './validate_esql_query';

const workflow = (steps: string): string => `name: esql
triggers:
  - type: manual
steps:
${steps}`;

const esqlStep = (name: string, query: string, indent = '  '): string =>
  [
    `${indent}- name: ${name}`,
    `${indent}  type: elasticsearch.esql.query`,
    `${indent}  with:`,
    `${indent}    query: |`,
    ...query.split('\n').map((line) => `${indent}      ${line}`),
    '',
  ].join('\n');

const schemaCallbacks: ESQLCallbacks = {
  getSources: async () => [{ name: 'logs-app', hidden: false }],
  getColumnsFor: async () => [
    { name: '@timestamp', type: 'date', userDefined: false },
    { name: 'host.name', type: 'keyword', userDefined: false },
  ],
};

describe('collectEsqlDiagnostics', () => {
  it('returns nothing when the workflow has no ES|QL step', async () => {
    const yaml = workflow(`  - name: log
    type: console
    with:
      message: hi
`);
    expect(await collectEsqlDiagnostics(yaml, {})).toEqual({ diagnostics: [], notChecked: [] });
  });

  it('reports a grammar error without any callbacks', async () => {
    const yaml = workflow(esqlStep('bad', 'FROM logs-app | WHERE'));
    const { diagnostics, notChecked } = await collectEsqlDiagnostics(yaml, {});

    expect(notChecked).toEqual([]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      severity: 'error',
      source: 'esql',
      ruleId: 'esqlDiagnostic',
      path: ['steps', 0, 'with', 'query'],
    });
    expect(diagnostics[0].message).toMatch(/^ES\|QL: .+ \(line 9, column \d+\)$/);
  });

  it('accepts a valid query', async () => {
    const yaml = workflow(esqlStep('ok', 'FROM logs-app | KEEP @timestamp, host.name'));
    expect(await collectEsqlDiagnostics(yaml, schemaCallbacks)).toEqual({
      diagnostics: [],
      notChecked: [],
    });
  });

  it('reports an unknown field as an error when callbacks are supplied', async () => {
    const { diagnostics } = await collectEsqlDiagnostics(
      workflow(esqlStep('fld', 'FROM logs-app | KEEP hostname')),
      schemaCallbacks
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({ severity: 'error', message: expect.stringContaining('hostname') }),
    ]);
  });

  it('reports an unknown index as an error with its own rule ID', async () => {
    const { diagnostics } = await collectEsqlDiagnostics(
      workflow(esqlStep('idx', 'FROM no-such-index | LIMIT 1')),
      schemaCallbacks
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        ruleId: 'esqlUnknownSource',
        message: expect.stringContaining('no-such-index'),
      }),
    ]);
  });

  it('does not report fields when the source returns no columns', async () => {
    const { diagnostics, notChecked } = await collectEsqlDiagnostics(
      workflow(esqlStep('empty', 'FROM metrics-* | STATS avg = AVG(system.cpu.pct) BY host.name')),
      { ...schemaCallbacks, getColumnsFor: async () => [] }
    );
    expect(diagnostics).toEqual([]);
    expect(notChecked).toEqual([expect.stringContaining('step "empty"')]);
  });

  it('does not report fields when a wildcard matches no index', async () => {
    const { diagnostics, notChecked } = await collectEsqlDiagnostics(
      workflow(
        esqlStep('nomatch', 'FROM metrics-* | STATS avg = AVG(system.cpu.pct) BY host.name')
      ),
      {
        ...schemaCallbacks,
        getColumnsFor: async () => [{ name: '<no-fields>', type: 'null', userDefined: false }],
      }
    );
    expect(diagnostics).toEqual([]);
    expect(notChecked).toEqual([expect.stringContaining('step "nomatch"')]);
  });

  it('does not report Liquid inside a string literal', async () => {
    const yaml = workflow(
      esqlStep('masked', 'FROM logs-app | WHERE host.name == "{{ inputs.host }}"')
    );
    expect(await collectEsqlDiagnostics(yaml, schemaCallbacks)).toEqual({
      diagnostics: [],
      notChecked: [],
    });
  });

  describe('structural Liquid', () => {
    it.each([
      'FROM {{ consts.idx }} | LIMIT 1',
      'FROM logs-{{ inputs.env }}-* | LIMIT 1',
      'FROM logs-* | LIMIT {{ inputs.n }}',
      'FROM logs-* | WHERE a > {{ inputs.n }}',
      'FROM logs-* | {{ inputs.cmd }} | LIMIT 1',
      'FROM logs-* | WHERE {{ inputs.cond }} | LIMIT 1',
      'FROM logs-* | STATS c = COUNT(*) BY {{ inputs.field }}',
      'FROM logs-* | WHERE @timestamp > NOW() - {{ inputs.days }} days',
      'FROM {{ consts.idx }} | EVAL x = {{ inputs.a }} + {{ inputs.b }}',
      'FROM {{ consts.idx }} | SORT {{ inputs.f }} {{ inputs.dir }}',
    ])('reports nothing for %s', async (query) => {
      const { diagnostics, notChecked } = await collectEsqlDiagnostics(
        workflow(esqlStep('liquid', query)),
        schemaCallbacks
      );
      expect(diagnostics).toEqual([]);
      expect(notChecked).toEqual([expect.stringContaining('only the grammar was checked')]);
    });

    it.each([
      ['a single-quoted string around Liquid', "FROM logs-* | WHERE a == '{{ inputs.x }}'"],
      ['an incomplete pipe', 'FROM {{ consts.idx }} | WHERE'],
      ['a trailing comma', 'FROM {{ consts.idx }} | KEEP a, | LIMIT 1'],
    ])('reports %s', async (_name, query) => {
      const { diagnostics } = await collectEsqlDiagnostics(
        workflow(esqlStep('liquid', query)),
        schemaCallbacks
      );
      expect(diagnostics).not.toEqual([]);
      expect(diagnostics.every(({ severity }) => severity === 'error')).toBe(true);
    });

    it.each([
      'FROM logs-* {% if inputs.f %}| WHERE b == 1{% endif %} | LIMIT 1',
      '{% raw %}FROM logs-* | LIMIT 1{% endraw %}',
      'FROM logs-* | WHERE @timestamp > NOW() - 1 day {% if inputs.h %}AND host.name == "{{ inputs.h }}"{% endif %}',
    ])('skips a query with a {%% %%} tag outside a string: %s', async (query) => {
      const { diagnostics, notChecked } = await collectEsqlDiagnostics(
        workflow(esqlStep('tag', query)),
        schemaCallbacks
      );
      expect(diagnostics).toEqual([]);
      expect(notChecked).toEqual([expect.stringContaining('{% %} tag outside a string literal')]);
    });

    it('still validates a {% %} tag inside a string literal', async () => {
      const { diagnostics, notChecked } = await collectEsqlDiagnostics(
        workflow(
          esqlStep(
            'masked_tag',
            'FROM logs-app | WHERE host.name == "{% if x %}a{% endif %}" | KEEP nope'
          )
        ),
        schemaCallbacks
      );
      expect(notChecked).toEqual([]);
      expect(diagnostics).toEqual([
        expect.objectContaining({ message: expect.stringContaining('nope') }),
      ]);
    });

    it('skips a query with an unclosed Liquid tag and says so in notChecked', async () => {
      const { diagnostics, notChecked } = await collectEsqlDiagnostics(
        workflow(esqlStep('unclosed', 'FROM logs-* | LIMIT {{ inputs.n')),
        schemaCallbacks
      );
      expect(diagnostics).toEqual([]);
      expect(notChecked).toEqual([expect.stringContaining('unclosed Liquid tag')]);
    });
  });

  describe('multi-line queries', () => {
    it('reports a missing pipe on line 2 when the line also has Liquid in a string', async () => {
      // Parser errors carry an absolute column. Read as a column within line 2,
      // it landed inside the masked Liquid span and the error was dropped.
      const { diagnostics } = await collectEsqlDiagnostics(
        workflow(
          esqlStep(
            'missing_pipe',
            'FROM logs-app\nWHERE host.name == "{{ inputs.host }}"\n| LIMIT 10'
          )
        ),
        {}
      );
      expect(diagnostics).toEqual([
        expect.objectContaining({
          message: expect.stringMatching(/mismatched input 'WHERE'.*\(line 10, column 9\)$/),
        }),
      ]);
    });

    it('positions lexer errors on line 2 by their column within the line', async () => {
      // The closing quote's column (25) also fits inside line 2's offset range,
      // so it must not be read as an offset.
      const { diagnostics } = await collectEsqlDiagnostics(
        workflow(esqlStep('quote', "FROM logs-app\n| WHERE a == 'bbbbbbbbbbbb'")),
        {}
      );
      expect(diagnostics.map(({ message }) => message.match(/column (\d+)/)?.[1])).toEqual([
        '22',
        '35',
      ]);
      expect(diagnostics[0].message).toMatch(
        /token recognition error at: '''.*\(line 10, column 22\)$/
      );
    });
  });

  describe('quoted scalars with escapes', () => {
    const quotedStep = (query: string): string => `  - name: quoted
    type: elasticsearch.esql.query
    with:
      query: ${query}
`;

    it.each([
      ['a double-quoted query with \\"', String.raw`"FROM logs-app | WHERE host.name == \"web\""`],
      ["a single-quoted query with ''", "'FROM logs-app | WHERE host.name == \"it''s\"'"],
    ])('accepts %s', async (_name, query) => {
      expect(await collectEsqlDiagnostics(workflow(quotedStep(query)), schemaCallbacks)).toEqual({
        diagnostics: [],
        notChecked: [],
      });
    });

    it('reports an error in a decoded query at the start of the query', async () => {
      const { diagnostics } = await collectEsqlDiagnostics(
        workflow(quotedStep(String.raw`"FROM logs-app | WHERE host.name == \"web\" |"`)),
        schemaCallbacks
      );
      expect(diagnostics).toEqual([
        expect.objectContaining({ message: expect.stringMatching(/\(line 8, column 15\)$/) }),
      ]);
    });
  });

  it('checks an ES|QL step in the workflow-level fallback', async () => {
    const yaml = `name: esql
triggers:
  - type: manual
settings:
  on-failure:
    fallback:
${esqlStep('recover', 'FROM logs-app | KEEP hostname', '      ')}steps:
  - name: log
    type: console
    with:
      message: hi
`;
    const { diagnostics } = await collectEsqlDiagnostics(yaml, schemaCallbacks);
    expect(diagnostics).toEqual([
      expect.objectContaining({
        path: ['settings', 'on-failure', 'fallback', 0, 'with', 'query'],
        message: expect.stringContaining('hostname'),
      }),
    ]);
  });

  it('ignores step-shaped data outside step lists', async () => {
    const decoy = `{ name: decoy, type: elasticsearch.esql.query, with: { query: 'FROM logs-app | WHERE' } }`;
    const yaml = `name: esql
consts:
  template: ${decoy}
triggers:
  - type: manual
steps:
  - name: post
    type: http
    with:
      url: https://example.com
      body: ${decoy}
`;
    expect(await collectEsqlDiagnostics(yaml, schemaCallbacks)).toEqual({
      diagnostics: [],
      notChecked: [],
    });
  });

  it('checks an ES|QL step when a later body map has the same name', async () => {
    const yaml = workflow(`${esqlStep('search', 'FROM logs-app | WHERE')}  - name: post
    type: http
    with:
      url: https://example.com
      body: { name: search, type: example }
`);
    const { diagnostics } = await collectEsqlDiagnostics(yaml, schemaCallbacks);

    expect(diagnostics.map(({ path }) => path)).toEqual([['steps', 0, 'with', 'query']]);
  });

  it('finds ES|QL steps nested in flow-control steps', async () => {
    const yaml = workflow(`  - name: loop
    type: foreach
    foreach: "{{ inputs.items }}"
    steps:
${esqlStep('inner', 'FROM logs-app | WHERE', '      ')}`);
    const { diagnostics } = await collectEsqlDiagnostics(yaml, {});

    expect(diagnostics.map(({ path }) => path)).toEqual([
      ['steps', 0, 'steps', 0, 'with', 'query'],
    ]);
  });

  it('skips a query longer than the size cap and says so in notChecked', async () => {
    const query = `FROM logs-app | WHERE host.name == "${'a'.repeat(
      MAX_VALIDATED_ESQL_QUERY_LENGTH
    )}" |`;
    const { diagnostics, notChecked } = await collectEsqlDiagnostics(
      workflow(esqlStep('huge', query)),
      schemaCallbacks
    );

    expect(diagnostics).toEqual([]);
    expect(notChecked).toEqual([expect.stringContaining('step "huge": it is longer than')]);
  });

  it('reports the step in notChecked when a callback throws', async () => {
    const yaml = workflow(esqlStep('boom', 'FROM logs-app | LIMIT 1'));
    const { diagnostics, notChecked } = await collectEsqlDiagnostics(yaml, {
      getSources: async () => {
        throw new Error('cluster unavailable');
      },
    });

    expect(diagnostics).toEqual([]);
    expect(notChecked).toEqual([expect.stringContaining('step "boom"')]);
  });
});
