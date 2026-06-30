/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Drives the *real* `@kbn/esql-language` validator end-to-end against the
// scenario matrix in the plan. Each row of the table in the plan is locked
// in here so any future regression in mask/skip behaviour fails loudly.

import { LineCounter, parseDocument } from 'yaml';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import { validateEsqlSteps } from './validate_esql_steps';
import { buildWorkflowLookup } from '../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

function createTextModel(content: string): monaco.editor.ITextModel {
  return {
    getValue: () => content,
    getValueLength: () => content.length,
    getPositionAt: (offset: number) => {
      const safe = Math.max(0, Math.min(offset, content.length));
      const before = content.slice(0, safe);
      const lines = before.split('\n');
      return {
        lineNumber: lines.length,
        column: lines[lines.length - 1].length + 1,
      } as monaco.Position;
    },
  } as monaco.editor.ITextModel;
}

function buildStep(query: string): string {
  const body = query
    .split('\n')
    .map((line) => `        ${line}`)
    .join('\n');
  return `steps:
  - name: esql_step
    type: elasticsearch.esql.query
    with:
      query: |
${body}
`;
}

const stubCallbacks: ESQLCallbacks = {
  getSources: async () => [
    { name: 'logs-app-*', hidden: false, type: 'Index' },
    { name: 'metrics-*', hidden: false, type: 'Index' },
  ],
  getColumnsFor: async () => [
    { name: '@timestamp', type: 'date', userDefined: false },
    { name: 'message', type: 'text', userDefined: false },
    { name: 'host.name', type: 'keyword', userDefined: false },
  ],
  getPolicies: async () => [],
  getPreferences: async () => ({ histogramBarTarget: 50 }),
  getLicense: async () => ({ hasAtLeast: () => true }),
};

async function validate(query: string) {
  const text = buildStep(query);
  const lineCounter = new LineCounter();
  const document = parseDocument(text, { lineCounter, keepSourceTokens: true });
  const workflowLookup = buildWorkflowLookup(document, lineCounter);
  const model = createTextModel(text);
  return validateEsqlSteps(workflowLookup, lineCounter, model, stubCallbacks);
}

describe('end-to-end ES|QL validation — Liquid policy (real validateQuery)', () => {
  describe('mask path (no false positives, real diagnostics still surface)', () => {
    it('row 1: Liquid in a string literal does not trip the validator', async () => {
      const markers = await validate('FROM logs-app-* | WHERE host.name == "{{ inputs.host }}"');
      expect(markers).toEqual([]);
    });

    it('row 8: a `{# … #}` Liquid comment is masked transparently', async () => {
      const markers = await validate('FROM logs-app-* {# pick the env #} | LIMIT 10');
      expect(markers).toEqual([]);
    });

    it('row 10: a real ES|QL typo on a non-Liquid step still surfaces', async () => {
      const markers = await validate('FROM logs-app-* | KEEPP @timestamp');
      expect(markers.length).toBeGreaterThan(0);
      // The marker must land on the query body line (after adding `name:` on its own line).
      expect(markers[0].startLineNumber).toBe(6);
      expect(markers[0].owner).toBe('esql-validation');
    });

    it('clean valid query produces zero diagnostics', async () => {
      const markers = await validate('FROM logs-app-* | KEEP @timestamp, message | LIMIT 10');
      expect(markers).toEqual([]);
    });
  });

  describe('skip path (zero false positives by skipping)', () => {
    const cases: Array<{ row: number; description: string; query: string }> = [
      { row: 2, description: 'Liquid in index pattern', query: 'FROM logs-{{ env }}-*' },
      { row: 3, description: 'Liquid as entire source', query: 'FROM {{ source }}' },
      {
        row: 4,
        description: 'Liquid as pipe command',
        query: 'FROM logs-app-* | {{ cmd }} count',
      },
      {
        row: 5,
        description: 'Liquid in function arg list',
        query: 'FROM logs-app-* | EVAL x = TO_INT({{ field }})',
      },
      {
        row: 6,
        description: 'Liquid as numeric literal',
        query: 'FROM logs-app-* | LIMIT {{ n }}',
      },
      { row: 7, description: 'Liquid wraps the whole query', query: '{{ query }}' },
      {
        row: 9,
        description: 'Liquid `{% raw %}` block outside a string',
        query: '{% raw %}FROM logs-* | LIMIT 1{% endraw %}',
      },
    ];

    for (const { row, description, query } of cases) {
      it(`row ${row}: ${description} produces no diagnostics`, async () => {
        const markers = await validate(query);
        expect(markers).toEqual([]);
      });
    }
  });

  describe('multi-step independence', () => {
    it('skips a Liquid-templated step and still flags a real typo on another', async () => {
      const text = `steps:
  - name: liquid_step
    type: elasticsearch.esql.query
    with:
      query: |
        FROM logs-{{ env }}-*
  - name: typo_step
    type: elasticsearch.esql.query
    with:
      query: |
        FROM logs-app-* | KEEPP @timestamp
`;
      const lineCounter = new LineCounter();
      const document = parseDocument(text, { lineCounter, keepSourceTokens: true });
      const workflowLookup = buildWorkflowLookup(document, lineCounter);
      const model = createTextModel(text);
      const markers = await validateEsqlSteps(workflowLookup, lineCounter, model, stubCallbacks);
      expect(markers.length).toBeGreaterThan(0);
      // The marker must point at the second step's body (line 10), not the first.
      expect(markers.every((m) => m.startLineNumber >= 10)).toBe(true);
    });
  });
});
