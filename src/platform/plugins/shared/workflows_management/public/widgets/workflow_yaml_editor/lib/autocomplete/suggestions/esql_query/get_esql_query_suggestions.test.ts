/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import { monaco } from '@kbn/monaco';
import { getEsqlQuerySuggestions } from './get_esql_query_suggestions';
import { findEsqlStepRegionsFromText } from '../../../esql_validation/extract_esql_region';
import type { ExtendedAutocompleteContext } from '../../context/autocomplete.types';

const mockSuggest = jest.fn();

jest.mock('@kbn/esql-language', () => ({
  __esModule: true,
  suggest: (...args: unknown[]) => mockSuggest(...args),
  // @kbn/monaco's Console ES|QL lexer reads this eagerly at module-load time to build its
  // keyword list, so it needs a stub here even though this suite doesn't exercise highlighting.
  esqlCommandRegistry: { getAllCommandNames: () => [] },
}));

const stubCallbacks: ESQLCallbacks = {};
const stubServices = { callbacks: stubCallbacks };

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
    // Stubbed: the helper only uses this to build a fallback insertion range
    // when ES|QL didn't provide rangeToReplace. Tests don't assert on this
    // fallback shape, so a zero-width range at the cursor is sufficient.
    getWordUntilPosition: (position: monaco.Position) => ({
      word: '',
      startColumn: position.column,
      endColumn: position.column,
    }),
  } as monaco.editor.ITextModel;
}

function buildEsqlStep(query: string): string {
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

function buildContextAtMatch(
  text: string,
  match: string,
  matchOffsetWithin: number = match.length
): { ctx: ExtendedAutocompleteContext; regionEsql: string } {
  // Region extraction uses buildWorkflowLookup, which only indexes steps with a `name`.
  const regions = findEsqlStepRegionsFromText(text);
  const region = regions[0] ?? null;
  const model = createTextModel(text);
  if (!region) {
    return {
      ctx: {
        model,
        position: { lineNumber: 1, column: 1 } as monaco.Position,
        esqlRegion: null,
        esqlOffsetInQuery: null,
        isInEsqlQueryField: false,
        absoluteOffset: 0,
      } as unknown as ExtendedAutocompleteContext,
      regionEsql: '',
    };
  }
  const matchStart = region.esql.indexOf(match);
  if (matchStart === -1) {
    throw new Error(`Test fixture: "${match}" not found in extracted region "${region.esql}"`);
  }
  const offsetInQuery = matchStart + matchOffsetWithin;
  const absoluteOffset = region.contentStartInFile + offsetInQuery;
  const position = model.getPositionAt(absoluteOffset);
  return {
    ctx: {
      model,
      position,
      esqlRegion: region,
      esqlOffsetInQuery: offsetInQuery,
      isInEsqlQueryField: true,
      absoluteOffset,
    } as unknown as ExtendedAutocompleteContext,
    regionEsql: region.esql,
  };
}

describe('getEsqlQuerySuggestions', () => {
  beforeEach(() => mockSuggest.mockReset());

  it('returns null when no region is provided (lets the dispatcher fall through)', async () => {
    const ctx = {
      model: createTextModel(''),
      position: {} as monaco.Position,
      esqlRegion: null,
      esqlOffsetInQuery: null,
      isInEsqlQueryField: false,
      absoluteOffset: 0,
    } as unknown as ExtendedAutocompleteContext;
    const items = await getEsqlQuerySuggestions(ctx, stubServices);
    expect(items).toBeNull();
    expect(mockSuggest).not.toHaveBeenCalled();
  });

  it('passes the (indent-preserved) query and offset to suggest() and maps results into Monaco items', async () => {
    // Region extraction trims trailing whitespace, so the trailing space after `|` is gone.
    const text = buildEsqlStep('FROM logs-* |');
    const { ctx, regionEsql } = buildContextAtMatch(text, 'FROM logs-* |');
    mockSuggest.mockResolvedValue([
      {
        label: 'WHERE',
        text: 'WHERE ',
        kind: 'Keyword',
        detail: 'Filter rows',
      },
      {
        label: 'KEEP',
        text: 'KEEP $0',
        kind: 'Keyword',
        asSnippet: true,
      },
    ]);

    const items = await getEsqlQuerySuggestions(ctx, stubServices);

    expect(mockSuggest).toHaveBeenCalledTimes(1);
    const [maskedQuery, offset, callbacks] = mockSuggest.mock.calls[0];
    // The cursor was right after `|` so the helper inserts a virtual space
    // and advances the offset by 1 (so ES|QL `suggest()` sees the cursor in
    // post-pipe position and returns next-command suggestions).
    expect(maskedQuery).toBe(`${regionEsql} `);
    expect(offset).toBe(regionEsql.indexOf('FROM logs-* |') + 'FROM logs-* |'.length + 1);
    expect(callbacks).toBe(stubCallbacks);

    expect(items).not.toBeNull();
    expect(items).toHaveLength(2);
    expect(items![0].label).toBe('WHERE');
    expect(items![0].insertText).toBe('WHERE ');
    expect(items![0].kind).toBe(monaco.languages.CompletionItemKind.Keyword);
    expect(items![1].insertTextRules).toBe(
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
    );
  });

  it('translates rangeToReplace into file-coordinate Monaco range', async () => {
    const text = buildEsqlStep('FROM logs');
    const { ctx, regionEsql } = buildContextAtMatch(text, 'FROM logs');
    const fromOffset = regionEsql.indexOf('FROM logs');
    mockSuggest.mockResolvedValue([
      {
        label: 'logs-*',
        text: 'logs-*',
        kind: 'Field',
        // Replace the 'logs' substring inside the region.
        rangeToReplace: { start: fromOffset + 5, end: fromOffset + 9 },
      },
    ]);

    const items = await getEsqlQuerySuggestions(ctx, stubServices);

    expect(items).not.toBeNull();
    expect(items![0].range).toBeDefined();
    const range = items![0].range as monaco.IRange;
    expect(range.startLineNumber).toBe(range.endLineNumber);
    expect(range.endColumn - range.startColumn).toBe(4); // 'logs'.length
  });

  it('masks Liquid spans inside string literals before calling suggest', async () => {
    const queryText = 'FROM logs | WHERE host == "{{ inputs.host }}"';
    const text = buildEsqlStep(queryText);
    // Cursor at the very end of the query — outside the masked span.
    const { ctx, regionEsql } = buildContextAtMatch(text, queryText);
    mockSuggest.mockResolvedValue([]);

    await getEsqlQuerySuggestions(ctx, stubServices);

    expect(mockSuggest).toHaveBeenCalledTimes(1);
    const [maskedQuery, offset] = mockSuggest.mock.calls[0];
    // Liquid markers are gone, total length is preserved.
    expect(maskedQuery).not.toMatch(/\{\{/);
    expect(maskedQuery).not.toMatch(/\}\}/);
    expect(maskedQuery).toHaveLength(regionEsql.length);
    expect(offset).toBe(regionEsql.indexOf(queryText) + queryText.length);
  });

  it('returns null when cursor is inside a Liquid span (defers to variable suggestions)', async () => {
    const queryText = 'FROM logs | WHERE host == "{{ inputs.host }}"';
    const text = buildEsqlStep(queryText);
    // Cursor inside the masked Liquid span: just after `inputs.`.
    const inside = 'inputs.';
    const { ctx } = buildContextAtMatch(text, inside);

    const items = await getEsqlQuerySuggestions(ctx, stubServices);

    expect(items).toBeNull();
    expect(mockSuggest).not.toHaveBeenCalled();
  });

  it('returns null when Liquid sits in a structural position', async () => {
    const queryText = 'FROM logs-{{ inputs.env }}-*';
    const text = buildEsqlStep(queryText);
    const { ctx } = buildContextAtMatch(text, queryText);

    const items = await getEsqlQuerySuggestions(ctx, stubServices);

    expect(items).toBeNull();
    expect(mockSuggest).not.toHaveBeenCalled();
  });

  it('inserts virtual space + advances offset when cursor sits right after `|`', async () => {
    // Without this, ES|QL's suggest() returns [] for cursors that are
    // immediately after a pipe token (no whitespace yet), and the dispatcher
    // falls through to Liquid-block-filter completions — exactly the user-
    // visible regression where typing `|` showed Liquid filter suggestions
    // instead of ES|QL command suggestions.
    const text = buildEsqlStep('FROM logs |');
    const { ctx, regionEsql } = buildContextAtMatch(text, 'FROM logs |');
    mockSuggest.mockResolvedValue([{ label: 'WHERE', text: 'WHERE ', kind: 'Keyword' }]);

    await getEsqlQuerySuggestions(ctx, stubServices);

    const [maskedQuery, offset] = mockSuggest.mock.calls[0];
    expect(maskedQuery).toBe(`${regionEsql} `);
    const pipeEnd = regionEsql.indexOf('|') + 1;
    expect(offset).toBe(pipeEnd + 1);
  });

  it('does NOT pad mid-identifier typing (cursor right after a letter)', async () => {
    // Cursor right after `A` of `STA` — the previous char is alphanumeric, not
    // a structural ES|QL token, so the helper must NOT inject a virtual
    // space (which would break filtering by treating "STA" as complete).
    const text = buildEsqlStep('FROM logs | STA');
    const { ctx, regionEsql } = buildContextAtMatch(text, 'STA');
    mockSuggest.mockResolvedValue([]);

    await getEsqlQuerySuggestions(ctx, stubServices);

    const [maskedQuery, offset] = mockSuggest.mock.calls[0];
    expect(maskedQuery).toBe(regionEsql);
    expect(offset).toBe(regionEsql.indexOf('STA') + 'STA'.length);
  });

  it('returns [] (suppress popup) when the cursor sits inside a Liquid comment `{# … #}`', async () => {
    // A Liquid comment is the user writing prose; surfacing variables or
    // filters there is wrong. We return [] so the dispatcher does NOT fall
    // through to the variable / filter paths, and the popup stays empty.
    const queryText = 'FROM logs {# todo: filter by env #} | LIMIT 10';
    const text = buildEsqlStep(queryText);
    const { ctx } = buildContextAtMatch(text, 'todo: filter');

    const items = await getEsqlQuerySuggestions(ctx, stubServices);

    expect(items).toEqual([]);
    expect(mockSuggest).not.toHaveBeenCalled();
  });

  it('runs ES|QL against the masked query when the cursor is outside any Liquid span', async () => {
    // `WHERE x == "{{ inputs.host }}" | LIMIT 10`, cursor right after `LIMIT 10`.
    // The Liquid span is masked to whitespace of the same length so offsets
    // line up; ES|QL sees a position-equivalent query and returns next-stage
    // suggestions for the user.
    const queryText = 'FROM logs | WHERE host == "{{ inputs.host }}" | LIMIT 10';
    const text = buildEsqlStep(queryText);
    const { ctx, regionEsql } = buildContextAtMatch(text, queryText);
    mockSuggest.mockResolvedValue([{ label: '|', text: ' | ', kind: 'Keyword' }]);

    await getEsqlQuerySuggestions(ctx, stubServices);

    const [maskedQuery, offset] = mockSuggest.mock.calls[0];
    // Liquid replaced with spaces of identical length so the cursor offset
    // and the rest of the query keep line/column parity.
    expect(maskedQuery).not.toMatch(/\{\{/);
    expect(maskedQuery).toHaveLength(regionEsql.length);
    expect(offset).toBe(regionEsql.length);
  });

  it('mixes kinds correctly: cursor in `{# … #}` suppresses, cursor in `{{ … }}` defers', async () => {
    // Same query, two cursor positions: a comment span suppresses, an
    // expression span defers. This is the discriminator the new `kind`
    // field on LiquidMaskedRange enables.
    const queryText = 'FROM logs {# audit #} | WHERE host == "{{ inputs.host }}"';
    const text = buildEsqlStep(queryText);

    const inComment = await getEsqlQuerySuggestions(
      buildContextAtMatch(text, 'audit').ctx,
      stubServices
    );
    expect(inComment).toEqual([]);

    const inExpression = await getEsqlQuerySuggestions(
      buildContextAtMatch(text, 'inputs.').ctx,
      stubServices
    );
    expect(inExpression).toBeNull();

    expect(mockSuggest).not.toHaveBeenCalled();
  });

  it('returns [] (NOT null) when suggest() throws — keeps Liquid fallthrough disabled', async () => {
    // This is the contract that prevents the user-visible regression where a
    // failed `suggest()` call let the dispatcher fall through to
    // `liquid-block-filter` completions (showing `abs`, `capitalize`, etc.)
    // inside an ES|QL body. Empty array means "ES|QL is in charge, just has
    // nothing right now"; null would mean "defer to other completion paths".
    const text = buildEsqlStep('FROM logs');
    const { ctx } = buildContextAtMatch(text, 'FROM logs');
    mockSuggest.mockRejectedValueOnce(new Error('boom'));

    const items = await getEsqlQuerySuggestions(ctx, stubServices);

    expect(items).toEqual([]);
    expect(items).not.toBeNull();
  });
});
