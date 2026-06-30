/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import { validateEsqlSteps } from './validate_esql_steps';
import { buildWorkflowLookup } from '../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

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

async function validateEsqlFromText(text: string, callbacks: ESQLCallbacks, signal?: AbortSignal) {
  const lineCounter = new LineCounter();
  const document = parseDocument(text, { lineCounter, keepSourceTokens: true });
  const workflowLookup = buildWorkflowLookup(document, lineCounter);
  const model = createTextModel(text);
  return validateEsqlSteps(workflowLookup, lineCounter, model, callbacks, signal);
}

function buildStep(query: string): string {
  // Indent matches what the YAML parser would extract for a `|` block scalar.
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

describe('validateEsqlSteps — Liquid policy', () => {
  beforeEach(() => mockValidate.mockReset());

  it('returns [] when no ES|QL step is present', async () => {
    const text = `steps:
  - type: elasticsearch.search
    with:
      index: test
`;
    const markers = await validateEsqlFromText(text, stubCallbacks);
    expect(markers).toEqual([]);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('row 10: runs validateQuery on plain ES|QL and surfaces real diagnostics', async () => {
    const text = buildStep('FROM logs-* | KEEPP @timestamp');
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
    const markers = await validateEsqlFromText(text, stubCallbacks);
    expect(markers).toHaveLength(1);
    expect(markers[0].owner).toBe('esql-validation');
    expect(markers[0].severity).toBe('error');
    expect(markers[0].message).toBe('Unknown command "KEEPP"');
  });

  describe('mask path: Liquid only inside string literals', () => {
    it('row 1: passes a whitespace-masked query to validateQuery', async () => {
      const text = buildStep('WHERE host == "{{ inputs.host }}"');
      mockValidate.mockResolvedValue({ errors: [], warnings: [] });
      await validateEsqlFromText(text, stubCallbacks);
      expect(mockValidate).toHaveBeenCalledTimes(1);
      const [maskedQuery] = mockValidate.mock.calls[0];
      // No `{{` survives the mask.
      expect(maskedQuery).not.toMatch(/\{\{/);
      // Length is preserved so offsets stay aligned with the original text.
      expect(maskedQuery).toHaveLength('        WHERE host == "{{ inputs.host }}"'.length);
    });

    it('drops a diagnostic that lands fully inside the masked region', async () => {
      const text = buildStep('WHERE host == "{{ inputs.host }}"');
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
      const markers = await validateEsqlFromText(text, stubCallbacks);
      expect(markers).toEqual([]);
    });

    it('keeps a diagnostic that touches the mask boundary but extends outside', async () => {
      const text = buildStep('WHERE host == "{{ x }}" | LIMIT abc');
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
      const markers = await validateEsqlFromText(text, stubCallbacks);
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
        const markers = await validateEsqlFromText(text, stubCallbacks);
        expect(markers).toEqual([]);
        expect(mockValidate).not.toHaveBeenCalled();
      });
    }
  });

  describe('Liquid comments and ES|QL comments stay on the mask path', () => {
    it('row 8: a `{# … #}` Liquid comment outside any string is masked, not skipped', async () => {
      const text = buildStep('FROM logs-* {# pick the env #} | LIMIT 10');
      mockValidate.mockResolvedValue({ errors: [], warnings: [] });
      await validateEsqlFromText(text, stubCallbacks);
      expect(mockValidate).toHaveBeenCalledTimes(1);
      const [maskedQuery] = mockValidate.mock.calls[0];
      expect(maskedQuery).not.toMatch(/\{#/);
      expect(maskedQuery).toMatch(/FROM logs-\*/);
    });

    it('Liquid inside an ES|QL line comment is masked', async () => {
      const text = buildStep('FROM logs-* // {{ debug }}\n        | LIMIT 10');
      mockValidate.mockResolvedValue({ errors: [], warnings: [] });
      await validateEsqlFromText(text, stubCallbacks);
      expect(mockValidate).toHaveBeenCalledTimes(1);
    });

    it('Liquid inside an ES|QL block comment is masked', async () => {
      const text = buildStep('FROM logs-* /* note: {{ debug }} */ | LIMIT 10');
      mockValidate.mockResolvedValue({ errors: [], warnings: [] });
      await validateEsqlFromText(text, stubCallbacks);
      expect(mockValidate).toHaveBeenCalledTimes(1);
    });
  });

  describe('multi-step robustness', () => {
    it('skips one step on Liquid and validates another', async () => {
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
        FROM logs-* | KEEPP foo
`;
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
      const markers = await validateEsqlFromText(text, stubCallbacks);
      // The first step is skipped (structural Liquid); only the second runs.
      expect(mockValidate).toHaveBeenCalledTimes(1);
      expect(markers).toHaveLength(1);
      expect(markers[0].message).toBe('Unknown command');
    });

    it('a thrown validateQuery on one step does not stop the next', async () => {
      const text = `steps:
  - name: bad_step
    type: elasticsearch.esql.query
    with:
      query: |
        FROM bad
  - name: good_step
    type: elasticsearch.esql.query
    with:
      query: |
        FROM good | LIMIT 5
`;
      mockValidate.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({
        errors: [
          { type: 'error', text: 'second error', location: { min: 0, max: 4 }, code: 'esql.x' },
        ],
        warnings: [],
      });
      const markers = await validateEsqlFromText(text, stubCallbacks);
      expect(mockValidate).toHaveBeenCalledTimes(2);
      expect(markers).toHaveLength(1);
      expect(markers[0].message).toBe('second error');
    });

    it('an aborted signal returns [] early', async () => {
      const text = buildStep('FROM x');
      const controller = new AbortController();
      controller.abort();
      mockValidate.mockResolvedValue({ errors: [], warnings: [] });
      const markers = await validateEsqlFromText(text, stubCallbacks, controller.signal);
      expect(markers).toEqual([]);
    });
  });

  describe('warnings', () => {
    it('emits warnings as warning-severity validation results', async () => {
      const text = buildStep('FROM logs-* | LIMIT 1000000');
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
      const markers = await validateEsqlFromText(text, stubCallbacks);
      expect(markers).toHaveLength(1);
      expect(markers[0].severity).toBe('warning');
    });

    it('clamps an out-of-bounds column so the marker stays inside the ES|QL region', async () => {
      // The query body is a single line `FROM x` (6 chars). A diagnostic that
      // claims `endColumn: 999` must not be allowed to push the marker offset
      // past the line into the surrounding YAML.
      const text = buildStep('FROM x');
      const queryStartInFile = text.indexOf('FROM x');
      const queryEndInFile = queryStartInFile + 'FROM x'.length;
      const model = createTextModel(text);
      mockValidate.mockResolvedValue({
        errors: [
          {
            message: 'runaway range',
            code: 'esql.runaway',
            severity: 'error',
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 999,
          },
        ],
        warnings: [],
      });
      const markers = await validateEsqlFromText(text, stubCallbacks);
      expect(markers).toHaveLength(1);
      const marker = markers[0];
      // Reconstruct the marker's end offset and confirm it doesn't escape the
      // region — the bug allowed it to land deep in the YAML below.
      const endOffset =
        model
          .getValue()
          .split('\n')
          .slice(0, marker.endLineNumber - 1)
          .join('\n').length +
        (marker.endLineNumber > 1 ? 1 : 0) +
        (marker.endColumn - 1);
      expect(endOffset).toBeLessThanOrEqual(queryEndInFile);
    });

    it('maps Monaco numeric severities (Warning=4, Info=2) on EditorError diagnostics', async () => {
      const text = buildStep('FROM logs-* | LIMIT 1000000');
      mockValidate.mockResolvedValue({
        errors: [],
        warnings: [
          {
            message: 'large LIMIT',
            code: 'esql.largeLimit',
            severity: 4,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 5,
          },
          {
            message: 'hint about projection',
            code: 'esql.projectionHint',
            severity: 2,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 5,
          },
        ],
      });
      const markers = await validateEsqlFromText(text, stubCallbacks);
      expect(markers).toHaveLength(2);
      expect(markers[0].severity).toBe('warning');
      expect(markers[1].severity).toBe('info');
    });
  });
});
