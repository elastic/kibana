/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Parity between the editor's ES|QL markers and the server validator behind
// `POST /api/workflows/validate`. Both run the real `@kbn/esql-language`
// validator over the same fixtures; any drift in Liquid handling, positions or
// severities fails here.

import { LineCounter, parseDocument } from 'yaml';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import { validateEsqlSteps } from './validate_esql_steps';
import { collectEsqlStepDiagnostics } from '../../../../../common/lib/esql_validation/collect_esql_diagnostics';
import { buildWorkflowLookup } from '../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

function createTextModel(content: string): monaco.editor.ITextModel {
  return {
    getValue: () => content,
    getValueLength: () => content.length,
    getPositionAt: (offset: number) => {
      const lines = content.slice(0, offset).split('\n');
      return {
        lineNumber: lines.length,
        column: lines[lines.length - 1].length + 1,
      } as monaco.Position;
    },
  } as monaco.editor.ITextModel;
}

const callbacks: ESQLCallbacks = {
  getSources: async () => [
    { name: 'logs-app', hidden: false },
    { name: 'empty-index', hidden: false },
  ],
  getColumnsFor: async ({ query } = { query: '' }) =>
    query.includes('empty-index')
      ? []
      : [
          { name: '@timestamp', type: 'date', userDefined: false },
          { name: 'host.name', type: 'keyword', userDefined: false },
        ],
};

const step = (name: string, queryLines: string[]): string =>
  [
    `  - name: ${name}`,
    '    type: elasticsearch.esql.query',
    '    with:',
    '      query: |',
    ...queryLines.map((line) => `        ${line}`),
  ].join('\n');

const FIXTURES: Record<string, string> = {
  'valid query': step('ok', ['FROM logs-app', '| KEEP @timestamp, host.name']),
  'grammar error': step('grammar', ['FROM logs-app | WHERE']),
  'unknown index': step('index', ['FROM no-such-index | LIMIT 1']),
  'source without columns': step('empty', ['FROM empty-index | KEEP anything']),
  'unknown field': step('field', ['FROM logs-app', '| KEEP hostname']),
  'liquid in a string literal': step('masked', [
    'FROM logs-app | WHERE host.name == "{{ inputs.host }}"',
  ]),
  'liquid in a structural position': step('structural', ['FROM logs-{{ inputs.env }} | LIMIT 1']),
  'quoted scalar': [
    '  - name: quoted',
    '    type: elasticsearch.esql.query',
    '    with:',
    '      query: "FROM logs-app | KEEP nope"',
  ].join('\n'),
  'escaped quotes in a quoted scalar': [
    '  - name: escaped',
    '    type: elasticsearch.esql.query',
    '    with:',
    String.raw`      query: "FROM logs-app | WHERE host.name == \"web\" | KEEP nope"`,
  ].join('\n'),
  'several steps': [
    step('first', ['FROM logs-app | KEEP a']),
    step('second', ['FROM other | LIMIT 1']),
  ].join('\n'),
};

const toWorkflow = (steps: string): string =>
  ['name: parity', 'triggers:', '  - type: manual', 'steps:', steps, ''].join('\n');

describe('ES|QL validation parity: editor vs server', () => {
  it.each(Object.entries(FIXTURES))('%s', async (_name, steps) => {
    const yaml = toWorkflow(steps);

    const lineCounter = new LineCounter();
    const document = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
    const editor = await validateEsqlSteps(
      buildWorkflowLookup(document, lineCounter),
      lineCounter,
      createTextModel(yaml),
      callbacks
    );
    const server = await collectEsqlStepDiagnostics(yaml, callbacks);

    const fromEditor = editor.map(({ startLineNumber, startColumn, message, severity }) => ({
      line: startLineNumber,
      column: startColumn,
      message,
      severity,
    }));
    const fromServer = server.diagnostics.map(({ line, column, message, severity }) => ({
      line,
      column,
      message,
      severity,
    }));

    expect(fromServer).toEqual(fromEditor);
  });

  it('flags the fixtures that are meant to fail', async () => {
    const failing = await Promise.all(
      Object.entries(FIXTURES).map(async ([name, steps]) => {
        const { diagnostics } = await collectEsqlStepDiagnostics(toWorkflow(steps), callbacks);
        return diagnostics.some(({ severity }) => severity === 'error') ? name : null;
      })
    );

    expect(failing.filter(Boolean)).toEqual([
      'grammar error',
      'unknown index',
      'unknown field',
      'quoted scalar',
      'escaped quotes in a quoted scalar',
      'several steps',
    ]);
  });
});
