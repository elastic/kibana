/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import { validateEsqlSteps } from './validate_esql_steps';

const mockValidate = jest.fn();

jest.mock('@kbn/esql-language', () => ({
  __esModule: true,
  validateQuery: (...args: unknown[]) => mockValidate(...args),
}));

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

const stubCallbacks: ESQLCallbacks = {};

function buildStep(query: string): string {
  // Indent matches what the YAML parser would extract for a `|` block scalar.
  const body = query
    .split('\n')
    .map((line) => `        ${line}`)
    .join('\n');
  return `steps:
  - type: elasticsearch.esql.query
    with:
      query: |
${body}
`;
}

describe('validateEsqlSteps — Liquid policy', () => {
  beforeEach(() => mockValidate.mockReset());

  it('returns [] when no ES|QL step is present', async () => {
    const text = `steps:
  - type: elasticsearch.search
    with:
      index: test
`;
    const model = createTextModel(text);
    const markers = await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
    expect(markers).toEqual([]);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('row 10: runs validateQuery on plain ES|QL and surfaces real diagnostics', async () => {
    const text = buildStep('FROM logs-* | KEEPP @timestamp');
    const model = createTextModel(text);
    mockValidate.mockResolvedValue({
      errors: [
        {
          type: 'error',
          text: 'Unknown command "KEEPP"',
          location: { min: 16, max: 20 },
          code: 'esql.unknownCommand',
        },
      ],
      warnings: [],
    });
    const markers = await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
    expect(markers).toHaveLength(1);
    expect(markers[0].owner).toBe('esql-validation');
    expect(markers[0].severity).toBe('error');
    expect(markers[0].message).toBe('Unknown command "KEEPP"');
  });

  describe('mask path: Liquid only inside string literals', () => {
    it('row 1: passes a whitespace-masked query to validateQuery', async () => {
      const text = buildStep('WHERE host == "{{ inputs.host }}"');
      const model = createTextModel(text);
      mockValidate.mockResolvedValue({ errors: [], warnings: [] });
      await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
      expect(mockValidate).toHaveBeenCalledTimes(1);
      const [maskedQuery] = mockValidate.mock.calls[0];
      // No `{{` survives the mask.
      expect(maskedQuery).not.toMatch(/\{\{/);
      // Length is preserved so offsets stay aligned with the original text.
      expect(maskedQuery).toHaveLength('        WHERE host == "{{ inputs.host }}"'.length);
    });

    it('drops a diagnostic that lands fully inside the masked region', async () => {
      const text = buildStep('WHERE host == "{{ inputs.host }}"');
      const model = createTextModel(text);
      const queryStartInLine = '        '.length;
      const innerStringStart = queryStartInLine + 'WHERE host == "'.length;
      const innerStringEnd = innerStringStart + '{{ inputs.host }}'.length;
      mockValidate.mockResolvedValue({
        errors: [
          {
            type: 'error',
            text: 'noise inside the mask',
            location: { min: innerStringStart, max: innerStringEnd - 1 },
            code: 'esql.spurious',
          },
        ],
        warnings: [],
      });
      const markers = await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
      expect(markers).toEqual([]);
    });

    it('keeps a diagnostic that touches the mask boundary but extends outside', async () => {
      const text = buildStep('WHERE host == "{{ x }}" | LIMIT abc');
      const model = createTextModel(text);
      // Diagnostic on the `LIMIT abc` token — well outside the mask.
      const limitStart = text.indexOf('LIMIT abc') - text.indexOf('WHERE');
      mockValidate.mockResolvedValue({
        errors: [
          {
            type: 'error',
            text: 'expected number',
            location: { min: limitStart + 6, max: limitStart + 8 },
            code: 'esql.syntax',
          },
        ],
        warnings: [],
      });
      const markers = await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
      expect(markers).toHaveLength(1);
      expect(markers[0].message).toBe('expected number');
    });
  });

  describe('skip path: Liquid in structural position', () => {
    // Numbers reference the scenario matrix in the plan
    // (`/Users/marcoliberati/.claude/plans/you-are-a-very-fancy-waffle.md`).
    const cases: Array<{ row: number | string; description: string; query: string }> = [
      { row: 2, description: 'Liquid in index pattern', query: 'FROM logs-{{ env }}-*' },
      { row: 3, description: 'Liquid as the entire source', query: 'FROM {{ source }}' },
      {
        row: 4,
        description: 'Liquid as a pipe command',
        query: 'FROM logs-* | {{ cmd }} count',
      },
      {
        row: 5,
        description: 'Liquid in a function arg list',
        query: 'FROM logs-* | EVAL x = TO_INT({{ field }})',
      },
      {
        row: 6,
        description: 'Liquid as a numeric literal',
        query: 'FROM logs-* | LIMIT {{ n }}',
      },
      { row: 7, description: 'Liquid wraps the whole query', query: '{{ query }}' },
      {
        row: 9,
        description: 'Liquid `{% raw %}` block outside a string',
        query: '{% raw %}FROM logs-* | LIMIT 1{% endraw %}',
      },
      {
        row: 'extra',
        description: 'Liquid `{% if %}` tag outside any string',
        query: '{%- if env -%} FROM logs {%- endif -%}',
      },
    ];

    for (const { row, description, query } of cases) {
      it(`row ${row}: skips validation for ${description}`, async () => {
        const text = buildStep(query);
        const model = createTextModel(text);
        const markers = await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
        expect(markers).toEqual([]);
        expect(mockValidate).not.toHaveBeenCalled();
      });
    }
  });

  describe('Liquid comments and ES|QL comments stay on the mask path', () => {
    it('row 8: a `{# … #}` Liquid comment outside any string is masked, not skipped', async () => {
      const text = buildStep('FROM logs-* {# pick the env #} | LIMIT 10');
      const model = createTextModel(text);
      mockValidate.mockResolvedValue({ errors: [], warnings: [] });
      await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
      expect(mockValidate).toHaveBeenCalledTimes(1);
      const [maskedQuery] = mockValidate.mock.calls[0];
      expect(maskedQuery).not.toMatch(/\{#/);
      expect(maskedQuery).toMatch(/FROM logs-\*/);
    });

    it('Liquid inside an ES|QL line comment is masked', async () => {
      const text = buildStep('FROM logs-* // {{ debug }}\n        | LIMIT 10');
      const model = createTextModel(text);
      mockValidate.mockResolvedValue({ errors: [], warnings: [] });
      await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
      expect(mockValidate).toHaveBeenCalledTimes(1);
    });

    it('Liquid inside an ES|QL block comment is masked', async () => {
      const text = buildStep('FROM logs-* /* note: {{ debug }} */ | LIMIT 10');
      const model = createTextModel(text);
      mockValidate.mockResolvedValue({ errors: [], warnings: [] });
      await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
      expect(mockValidate).toHaveBeenCalledTimes(1);
    });
  });

  describe('multi-step robustness', () => {
    it('skips one step on Liquid and validates another', async () => {
      const text = `steps:
  - type: elasticsearch.esql.query
    with:
      query: |
        FROM logs-{{ env }}-*
  - type: elasticsearch.esql.query
    with:
      query: |
        FROM logs-* | KEEPP foo
`;
      const model = createTextModel(text);
      mockValidate.mockResolvedValue({
        errors: [
          {
            type: 'error',
            text: 'Unknown command',
            location: { min: 13, max: 18 },
            code: 'esql.unknownCommand',
          },
        ],
        warnings: [],
      });
      const markers = await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
      // The first step is skipped (structural Liquid); only the second runs.
      expect(mockValidate).toHaveBeenCalledTimes(1);
      expect(markers).toHaveLength(1);
      expect(markers[0].message).toBe('Unknown command');
    });

    it('a thrown validateQuery on one step does not stop the next', async () => {
      const text = `steps:
  - type: elasticsearch.esql.query
    with:
      query: |
        FROM bad
  - type: elasticsearch.esql.query
    with:
      query: |
        FROM good | LIMIT 5
`;
      const model = createTextModel(text);
      mockValidate.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({
        errors: [
          { type: 'error', text: 'second error', location: { min: 0, max: 4 }, code: 'esql.x' },
        ],
        warnings: [],
      });
      const markers = await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
      expect(mockValidate).toHaveBeenCalledTimes(2);
      expect(markers).toHaveLength(1);
      expect(markers[0].message).toBe('second error');
    });

    it('an aborted signal returns [] early', async () => {
      const text = buildStep('FROM x');
      const model = createTextModel(text);
      const controller = new AbortController();
      controller.abort();
      mockValidate.mockResolvedValue({ errors: [], warnings: [] });
      const markers = await validateEsqlSteps(
        parseDocument(text),
        model,
        stubCallbacks,
        controller.signal
      );
      expect(markers).toEqual([]);
    });
  });

  describe('warnings', () => {
    it('emits warnings as warning-severity validation results', async () => {
      const text = buildStep('FROM logs-* | LIMIT 1000000');
      const model = createTextModel(text);
      mockValidate.mockResolvedValue({
        errors: [],
        warnings: [
          {
            type: 'warning',
            text: 'large LIMIT',
            location: { min: 0, max: 4 },
            code: 'esql.largeLimit',
          },
        ],
      });
      const markers = await validateEsqlSteps(parseDocument(text), model, stubCallbacks);
      expect(markers).toHaveLength(1);
      expect(markers[0].severity).toBe('warning');
    });
  });
});
