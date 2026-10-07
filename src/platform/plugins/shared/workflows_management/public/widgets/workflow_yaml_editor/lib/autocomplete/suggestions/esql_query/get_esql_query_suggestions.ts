/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { suggest } from '@kbn/esql-language';
import type { ISuggestionItem } from '@kbn/esql-language/src/commands/registry/types';
import { monaco } from '@kbn/monaco';
import {
  applyLiquidMask,
  classifyLiquidPosition,
  findMaskedRangeAtOffset,
} from '../../../esql_validation/classify_liquid_position';
import type { EsqlStepRegion } from '../../../esql_validation/extract_esql_region';
import type { ExtendedAutocompleteContext } from '../../context/autocomplete.types';
import type { WorkflowEsqlCompletionServices } from '../workflow_esql_completion_services';

/**
 * ES|QL tokens that mark a hard boundary between commands or arguments. When
 * the cursor sits immediately after one of these and before whitespace, the
 * upstream `suggest()` returns nothing — see `padForStructuralBoundary`.
 */
const STRUCTURAL_ESQL_TOKENS: ReadonlySet<string> = new Set(['|', '(', ',']);

/**
 * Maps the (subset of) `ItemKind` strings produced by `@kbn/esql-language` to
 * Monaco's numeric kind. Exhaustive on purpose: a new ItemKind upstream would
 * produce a TS error here rather than silently fall back to `Method`.
 */
const ITEM_KIND_TO_MONACO: Readonly<
  Record<ISuggestionItem['kind'], monaco.languages.CompletionItemKind>
> = {
  Method: monaco.languages.CompletionItemKind.Method,
  Function: monaco.languages.CompletionItemKind.Function,
  Field: monaco.languages.CompletionItemKind.Field,
  Variable: monaco.languages.CompletionItemKind.Variable,
  Class: monaco.languages.CompletionItemKind.Class,
  Operator: monaco.languages.CompletionItemKind.Operator,
  Value: monaco.languages.CompletionItemKind.Value,
  Constant: monaco.languages.CompletionItemKind.Constant,
  Keyword: monaco.languages.CompletionItemKind.Keyword,
  Text: monaco.languages.CompletionItemKind.Text,
  Reference: monaco.languages.CompletionItemKind.Reference,
  Snippet: monaco.languages.CompletionItemKind.Snippet,
  Issue: monaco.languages.CompletionItemKind.Issue,
  Folder: monaco.languages.CompletionItemKind.Folder,
};

/** Input prepared for `suggest()`: the (possibly transformed) text and the cursor offset within it. */
interface SuggestInput {
  readonly text: string;
  readonly offset: number;
}

/**
 * Returns ES|QL completion items for the cursor position when it sits inside
 * the `with.query` value of an `elasticsearch.esql.query` step.
 *
 * Return value contract:
 *   - `null`: defer to the dispatcher's other suggestion paths. Used when
 *     the cursor sits inside a Liquid `{{ … }}` / `{% … %}` span so the
 *     workflow variable-completion path can offer references.
 *   - `[]`: ES|QL is in charge here but has nothing to suggest (e.g. the
 *     parser failed). The dispatcher MUST NOT fall through; otherwise
 *     Liquid-filter completions would mistakenly hijack the popup.
 *   - non-empty array: ES|QL's suggestions, mapped to Monaco completion items.
 */
export async function getEsqlQuerySuggestions(
  ctx: ExtendedAutocompleteContext,
  services: WorkflowEsqlCompletionServices
): Promise<monaco.languages.CompletionItem[] | null> {
  const { esqlRegion: region, esqlOffsetInQuery: offsetInQuery } = ctx;
  if (region === null || offsetInQuery === null) {
    return null;
  }

  const padded = padForStructuralBoundary(padTrailingWhitespace(region.esql, offsetInQuery));

  const liquid = classifyLiquidPosition(padded.text);
  if (liquid.kind === 'has-structural') {
    // Liquid replaces ES|QL syntax (e.g. `FROM logs-{{ env }}-*`). We can't
    // honestly complete the masked positions; defer so the variable path can
    // pick up the cursor when it's inside a `{{ … }}` span.
    return null;
  }

  const maskedRanges = liquid.maskedRanges;

  const containingRange = findMaskedRangeAtOffset(padded.offset, maskedRanges);
  if (containingRange !== null) {
    // Cursor is inside a Liquid construct. Comments suppress the popup
    // entirely (the user is writing prose); expressions and tags defer to
    // the dispatcher so the variable / Liquid completion paths can run.
    return containingRange.kind === 'comment' ? [] : null;
  }

  const masked: SuggestInput = {
    text: applyLiquidMask(padded.text, maskedRanges),
    offset: padded.offset,
  };

  const rawSuggestions = await safeSuggest(masked, services);
  if (rawSuggestions === null) {
    // Failure surfaced via console.warn; keep ownership of the popup so the
    // dispatcher doesn't leak Liquid filter completions into ES|QL bodies.
    return [];
  }

  return rawSuggestions.map((suggestion) => toMonacoItem(suggestion, ctx, region));
}

/**
 * Region extraction trims trailing whitespace, but the cursor can legitimately
 * sit in that whitespace while typing. Pad the text up to the cursor with spaces
 * so `suggest()`'s precondition (text length >= cursor offset) is satisfied.
 */
function padTrailingWhitespace(text: string, offset: number): SuggestInput {
  if (offset <= text.length) {
    return { text, offset };
  }
  return { text: text + ' '.repeat(offset - text.length), offset };
}

/**
 * ES|QL's `suggest()` returns nothing when the cursor sits IMMEDIATELY after
 * a structural token (`|`, `(`, `,`) with no trailing whitespace — the parser
 * can't tell whether the user is finishing the previous command or starting
 * the next one. Monaco's reference ES|QL language sidesteps this by only
 * firing on space; we fire on the structural token itself so completions
 * appear *immediately* after `|`. Emulate the post-token state by inserting
 * a single virtual space and advancing the cursor past it.
 *
 * Mid-identifier typing (cursor right after `STA`) is unaffected because the
 * preceding character is alphanumeric, not structural.
 */
function padForStructuralBoundary(input: SuggestInput): SuggestInput {
  const { text, offset } = input;
  if (offset === 0) return input;

  const charBefore = text.charAt(offset - 1);
  if (!STRUCTURAL_ESQL_TOKENS.has(charBefore)) return input;

  const charAt = text.charAt(offset);
  const isCursorAtEndOrBeforeToken = charAt === '' || !isWhitespace(charAt);
  if (!isCursorAtEndOrBeforeToken) return input;

  return {
    text: `${text.slice(0, offset)} ${text.slice(offset)}`,
    offset: offset + 1,
  };
}

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

async function safeSuggest(
  input: SuggestInput,
  services: WorkflowEsqlCompletionServices
): Promise<ISuggestionItem[] | null> {
  try {
    return await suggest(input.text, input.offset, services.callbacks);
  } catch (e) {
    // Log so a runtime failure doesn't silently disable ES|QL completion.
    // eslint-disable-next-line no-console
    console.warn('[workflows-yaml-editor] ES|QL suggest() failed:', e);
    return null;
  }
}

function toMonacoItem(
  suggestion: ISuggestionItem,
  ctx: ExtendedAutocompleteContext,
  region: EsqlStepRegion
): monaco.languages.CompletionItem {
  return {
    label: suggestion.label,
    insertText: suggestion.text,
    filterText: suggestion.filterText,
    kind: ITEM_KIND_TO_MONACO[suggestion.kind],
    detail: suggestion.detail,
    documentation: suggestion.documentation,
    sortText: suggestion.sortText,
    command: suggestion.command,
    insertTextRules: suggestion.asSnippet
      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : undefined,
    range: rangeForSuggestion(suggestion, ctx, region),
  };
}

function rangeForSuggestion(
  suggestion: ISuggestionItem,
  ctx: ExtendedAutocompleteContext,
  region: EsqlStepRegion
): monaco.IRange {
  const { rangeToReplace } = suggestion;
  if (rangeToReplace) {
    const replacement = mapRegionRangeToFile(rangeToReplace, region, ctx.model);
    if (replacement !== null) {
      return replacement;
    }
  }
  return wordRangeAt(ctx.model, ctx.position);
}

/**
 * Translates a zero-based `[start, end)` range from ES|QL-local offsets to a
 * line/column-based Monaco range in the model. Returns null if the range is
 * malformed; the caller falls back to the cursor's word range.
 */
function mapRegionRangeToFile(
  rangeToReplace: NonNullable<ISuggestionItem['rangeToReplace']>,
  region: EsqlStepRegion,
  model: monaco.editor.ITextModel
): monaco.IRange | null {
  const startOffset = region.contentStartInFile + rangeToReplace.start;
  const endOffset = region.contentStartInFile + rangeToReplace.end;
  if (startOffset < 0 || endOffset < startOffset) {
    return null;
  }
  const maxOffset = model.getValueLength();
  const safeStart = Math.min(startOffset, maxOffset);
  const safeEnd = Math.min(Math.max(endOffset, safeStart), maxOffset);
  const startPos = model.getPositionAt(safeStart);
  const endPos = model.getPositionAt(safeEnd);
  return {
    startLineNumber: startPos.lineNumber,
    startColumn: startPos.column,
    endLineNumber: endPos.lineNumber,
    endColumn: endPos.column,
  };
}

function wordRangeAt(model: monaco.editor.ITextModel, position: monaco.Position): monaco.IRange {
  const word = model.getWordUntilPosition(position);
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
}
