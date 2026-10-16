/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Template-local context: variables defined in the same Liquid template string
 * via {% assign %}, {% capture %}, or {% for %} loop scope.
 * Used by the editor for validation and autocomplete so that references to
 * these variables are not reported as invalid and appear in suggestions.
 *
 * Walks the parsed LiquidJS AST using only declared public API properties:
 * Tag.name, AssignTag.localScope(), TagToken.args,
 * ForTag.variable/collection/templates, CaptureTag.variable/templates,
 * and Template.children().
 */

import type { AssignTag, CaptureTag, ForTag, Tag, Template } from 'liquidjs';
import { LRUCache } from 'lru-cache';
import { getLiquidInstance, parseTemplateString } from '../../liquid/liquid_parse_cache';

export interface AssignVariable {
  name: string;
  /** Right-hand side of the assign (e.g. "steps.x.outputs.value" or "42"). Used to infer type. */
  rhs: string;
}

export interface ForLoopScope {
  variableName: string;
  bodyStart: number;
  bodyEnd: number;
  /** Resolved path of the collection (e.g. "steps.x.outputs.items") for schema lookup. */
  collectionPath?: string;
  /** Start offset of the collection expression in the template string (from Liquid token). */
  collectionStart?: number;
  /** End offset of the collection expression in the template string (from Liquid token). */
  collectionEnd?: number;
}

export interface TemplateLocalContext {
  /** Assign variables with RHS for type inference. */
  readonly assignVars: readonly AssignVariable[];
  /** Capture variable names; capture output is always string. */
  readonly captureNames: readonly string[];
  readonly forLoopScopes: readonly ForLoopScope[];
  /**
   * Identifies the locals in effect rather than the offset that asked for them,
   * so callers can reuse a built schema across references that share them.
   */
  readonly signature: string;
}

const EMPTY_CONTEXT: TemplateLocalContext = Object.freeze({
  assignVars: [],
  captureNames: [],
  forLoopScopes: [],
  signature: '',
});

// ---------------------------------------------------------------------------
// Tag-type narrowing helpers
// ---------------------------------------------------------------------------

function isTag(tpl: unknown): tpl is Tag {
  return tpl != null && typeof tpl === 'object' && 'name' in tpl && typeof tpl.name === 'string';
}

function isAssignTagType(tpl: unknown): tpl is AssignTag {
  return isTag(tpl) && tpl.name === 'assign';
}

function isCaptureTagType(tpl: unknown): tpl is CaptureTag {
  return isTag(tpl) && tpl.name === 'capture';
}

function isForTagType(tpl: unknown): tpl is ForTag {
  return isTag(tpl) && tpl.name === 'for';
}

// ---------------------------------------------------------------------------
// Assign arg parsing (operates on the public TagToken.args string)
// ---------------------------------------------------------------------------

export function parseAssignRhs(args: string): string | null {
  const trimmed = args.trim();
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) return null;
  return trimmed.slice(eqIndex + 1).trim() || null;
}

/** Matches a single Liquid identifier (not a dotted workflow path). */
const SINGLE_IDENTIFIER_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/** Liquid for-loop range literal, e.g. `(1..3)`. */
export const LIQUID_RANGE_LITERAL_REGEX = /^\(\s*\d+\s*\.\.\s*\d+\s*\)$/;

const QUOTED_OR_PIPE = /"[^"]*"|'[^']*'|(\|)/g;

/** Strips Liquid filters from an expression by finding the first `|` outside quoted strings. */
export function stripAssignRhsFilters(rhs: string): string {
  const firstPipe = Array.from(rhs.matchAll(QUOTED_OR_PIPE)).find((m) => m[1] !== undefined);
  return firstPipe ? rhs.slice(0, firstPipe.index).trim() : rhs.trim();
}

export function isLiquidRangeLiteral(collectionPath: string): boolean {
  return LIQUID_RANGE_LITERAL_REGEX.test(collectionPath.trim());
}

/** Liquid string literal, e.g. the `""` left behind by `{% assign acc = "" | split: "" %}`. */
const LIQUID_STRING_LITERAL_REGEX = /^(?:"[^"]*"|'[^']*')$/;

/**
 * True when an expression is a quoted string literal rather than a context path.
 * {@link resolveAssignChain} strips filters, so an assign whose value comes from a
 * literal plus filters (`"" | split: ""`, `"a,b" | split: ","`) resolves to the bare
 * literal — the real type comes from the filter chain and is only known at runtime.
 */
export function isLiquidStringLiteral(collectionPath: string): boolean {
  return LIQUID_STRING_LITERAL_REGEX.test(collectionPath.trim());
}

/**
 * Follows assign aliases until a dotted path or unknown identifier is reached.
 * Used to validate `{% for item in rows %}` when `rows` was assigned from `consts.items`.
 */
export function resolveAssignChain(
  collectionPath: string,
  assignVars: readonly AssignVariable[]
): string {
  let path = collectionPath.trim();
  const seen = new Set<string>();

  while (SINGLE_IDENTIFIER_REGEX.test(path) && !seen.has(path)) {
    seen.add(path);
    const assign = assignVars.find((a) => a.name === path);
    if (!assign) {
      break;
    }
    const rhs = stripAssignRhsFilters(assign.rhs);
    if (!rhs) {
      break;
    }
    path = rhs;
  }

  return path;
}

// ---------------------------------------------------------------------------
// Scope boundary helpers
// ---------------------------------------------------------------------------

function getMaxTokenEnd(templates: Template[]): number {
  let maxEnd = 0;
  for (const tpl of templates) {
    const { token } = tpl;
    if (token && typeof token.end === 'number') {
      maxEnd = Math.max(maxEnd, token.end);
    }
    if (tpl.children) {
      const childTemplates = resolveChildren(tpl);
      maxEnd = Math.max(maxEnd, getMaxTokenEnd(childTemplates));
    }
  }
  return maxEnd;
}

/**
 * Returns for-loop scopes that contain the given offset (for validation/autocomplete).
 * Inner loops come later in the array so that when merging into schema, inner wins.
 */
export function forLoopScopesContainingOffset(
  forLoopScopes: readonly ForLoopScope[],
  offsetInTemplate: number
): ForLoopScope[] {
  return forLoopScopes.filter(
    (scope) => offsetInTemplate >= scope.bodyStart && offsetInTemplate < scope.bodyEnd
  );
}

// ---------------------------------------------------------------------------
// Tree traversal via public Template.children() generator
// ---------------------------------------------------------------------------

function resolveChildren(tpl: Template): Template[] {
  if (!tpl.children) return [];
  const gen = tpl.children(false, true);
  let result = gen.next();
  while (!result.done) {
    result = gen.next();
  }
  return result.value ?? [];
}

interface LiquidExpressionTokenRange {
  readonly start: number;
  readonly end: number;
}

function hasNumericBeginEnd(value: object): value is { begin: number; end: number } {
  return (
    'begin' in value &&
    'end' in value &&
    typeof value.begin === 'number' &&
    typeof value.end === 'number'
  );
}

function getExpressionTokenRange(expression: unknown): LiquidExpressionTokenRange | undefined {
  if (expression != null && typeof expression === 'object' && hasNumericBeginEnd(expression)) {
    return { start: expression.begin, end: expression.end };
  }
  return undefined;
}

/** Uses the shared LRU cache in @kbn/workflows-yaml `parseTemplateString`. */
function safeParseTemplate(templateString: string): Template[] | null {
  try {
    return parseTemplateString(templateString);
  } catch {
    return null;
  }
}

function templateHasLiquidTagNodes(templates: Template[]): boolean {
  for (const tpl of templates) {
    if (isTag(tpl)) {
      return true;
    }
    if (tpl.children) {
      const children = resolveChildren(tpl);
      if (children.length > 0 && templateHasLiquidTagNodes(children)) {
        return true;
      }
    }
  }
  return false;
}

function pushForLoopScope(
  acc: WalkAccumulator,
  variableName: string,
  token: { end: number },
  bodyTemplates: Template[],
  collectionPath: string,
  collectionRange: LiquidExpressionTokenRange | undefined
): void {
  const bodyStart = token.end;
  const bodyEnd = getMaxTokenEnd(bodyTemplates);
  if (variableName && bodyEnd >= bodyStart) {
    acc.forLoopScopes.push({
      variableName,
      bodyStart,
      bodyEnd,
      collectionPath: collectionPath !== '' ? collectionPath : undefined,
      collectionStart: collectionRange?.start,
      collectionEnd: collectionRange?.end,
    });
  }
}

// ---------------------------------------------------------------------------
// AST walk
// ---------------------------------------------------------------------------

interface WalkAccumulator {
  assignVars: Array<{ gate: number; variable: AssignVariable }>;
  captureNames: Array<{ gate: number; name: string }>;
  forLoopScopes: ForLoopScope[];
}

/**
 * Records every tag with the offset that gates it, so one walk serves every
 * cursor offset instead of one walk per reference.
 */
function walkTemplates(templates: Template[], acc: WalkAccumulator): void {
  for (const tpl of templates) {
    const { token } = tpl;
    const children = tpl.children ? resolveChildren(tpl) : [];

    if (token && typeof token.begin === 'number' && typeof token.end === 'number') {
      if (isAssignTagType(tpl)) {
        const firstId = tpl.localScope()[Symbol.iterator]().next();
        const varName = firstId.done ? null : firstId.value.content;
        const rhs = parseAssignRhs(tpl.token.args);
        if (varName) {
          acc.assignVars.push({
            gate: token.end,
            variable: { name: varName, rhs: rhs ?? '' },
          });
        }
      } else if (isCaptureTagType(tpl)) {
        acc.captureNames.push({
          gate: getMaxTokenEnd(tpl.templates),
          name: tpl.variable,
        });
      } else if (isForTagType(tpl)) {
        const { variable: variableName, collection, templates: bodyTemplates } = tpl;
        pushForLoopScope(
          acc,
          variableName,
          token,
          bodyTemplates,
          collection.getText(),
          getExpressionTokenRange(collection)
        );
      }
    }

    if (children.length > 0) {
      walkTemplates(children, acc);
    }
  }
}

/**
 * Extracts template-local variable definitions and for-loop scopes from a Liquid
 * template string. Used to extend workflow context for validation and autocomplete
 * so that assign/capture/for-loop variables are recognized.
 *
 * Walks the parsed AST using only declared public LiquidJS API properties
 * (Tag.name, AssignTag.localScope(), TagToken.args,
 * ForTag.variable/collection/templates, CaptureTag.variable/templates,
 * Template.children()).
 *
 * On parse error returns empty context so the editor stays usable
 * (e.g. when the user is mid-edit).
 *
 * Known limitations:
 * - `{% increment %}` and `{% decrement %}` tags are not extracted. Variables
 *   introduced by these tags will still be reported as unknown.
 * - Assigns inside conditional branches (`{% if %}`/`{% else %}`) are treated
 *   as unconditionally available once their tag offset is before the cursor,
 *   even though the branch might not execute at runtime.
 *
 * @param templateString - Full content of the scalar (e.g. a step's message field)
 * @param offsetInTemplate - Character offset inside the template (cursor position)
 */
/**
 * Returns every `{% for %}` scope in the template (not filtered by cursor offset).
 * Used to validate collection paths across the full template string.
 */
export function getAllForLoopScopes(templateString: string): ForLoopScope[] {
  return getTemplateLocalIndex(templateString).forLoopScopes;
}

/** One walk of a template, tagged so any cursor offset is a prefix of it. */
interface TemplateLocalIndex {
  /** Distinguishes templates in the signature, so two of them cannot collide. */
  id: number;
  assignVars: Array<{ gate: number; variable: AssignVariable }>;
  captureNames: Array<{ gate: number; name: string }>;
  forLoopScopes: ForLoopScope[];
}

const EMPTY_INDEX: TemplateLocalIndex = {
  id: 0,
  assignVars: [],
  captureNames: [],
  forLoopScopes: [],
};

let nextIndexId = 1;

/**
 * An entry cannot grow without limit: the Liquid engine refuses to parse a
 * template above its `parseLimit` of 150,000 characters, and the densest
 * template that does parse — one assign every 26 characters — indexes to
 * ~660 KiB including the string it is keyed by. So this many entries is a
 * ceiling of roughly 10 MiB.
 */
const MAX_CACHED_TEMPLATES = 16;
const indexCache = new LRUCache<string, TemplateLocalIndex>({ max: MAX_CACHED_TEMPLATES });

/** Whether one template is currently cached, for tests that assert eviction. */
export function hasCachedTemplateLocalIndex(templateString: string): boolean {
  return indexCache.has(templateString);
}

function buildTemplateLocalIndex(templateString: string): TemplateLocalIndex {
  const templates = safeParseTemplate(templateString);
  if (!templates || !templateHasLiquidTagNodes(templates)) {
    return EMPTY_INDEX;
  }
  const acc: WalkAccumulator = { assignVars: [], captureNames: [], forLoopScopes: [] };
  walkTemplates(templates, acc);
  // Both lists are searched by gate, so both are sorted by it. A capture is
  // recorded before the nested tags it contains yet closes after them, so walk
  // order is not gate order. Assigns happen to come out ordered already, but
  // sorting only the list that visibly needs it is how that was missed once.
  acc.assignVars.sort((a, b) => a.gate - b.gate);
  acc.captureNames.sort((a, b) => a.gate - b.gate);
  return {
    id: nextIndexId++,
    assignVars: acc.assignVars,
    captureNames: acc.captureNames,
    forLoopScopes: acc.forLoopScopes,
  };
}

/**
 * The walk of one template, kept across validation runs on purpose: a keystroke
 * reparses the document, and every scalar the edit did not touch keys the same
 * string, so reuse across runs is the reuse that matters in the editor.
 */
function getTemplateLocalIndex(templateString: string): TemplateLocalIndex {
  if (!templateString.includes('{%')) {
    return EMPTY_INDEX;
  }
  const cached = indexCache.get(templateString);
  if (cached) {
    return cached;
  }
  const index = buildTemplateLocalIndex(templateString);
  // A failed parse is cached like any other: a malformed scalar is otherwise
  // parsed again for every reference in it. Only a template over the engine's
  // parse limit is left out — it is rejected on length before any scanning, so
  // recomputing costs nothing and caching would only retain the string.
  if (templateString.length <= getLiquidInstance().options.parseLimit) {
    indexCache.set(templateString, index);
  }
  return index;
}

/**
 * Length of the prefix gated at or before `offset`. A linear filter reads the
 * same but measured ~70% slower on a template holding thousands of assigns.
 */
function prefixLength(entries: Array<{ gate: number }>, offset: number): number {
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (entries[mid].gate <= offset) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

export function getTemplateLocalContext(
  templateString: string,
  offsetInTemplate: number
): TemplateLocalContext {
  const index = getTemplateLocalIndex(templateString);
  if (index === EMPTY_INDEX) {
    return EMPTY_CONTEXT;
  }

  const assigns = index.assignVars.slice(0, prefixLength(index.assignVars, offsetInTemplate));
  const captures = index.captureNames.slice(0, prefixLength(index.captureNames, offsetInTemplate));
  // Same predicate the caller applies, so a signature cannot claim a scope the
  // built schema leaves out.
  const scopes = forLoopScopesContainingOffset(index.forLoopScopes, offsetInTemplate);

  return {
    assignVars: assigns.map(({ variable }) => variable),
    captureNames: Array.from(new Set(captures.map(({ name }) => name))),
    forLoopScopes: index.forLoopScopes,
    signature: `${index.id}:${assigns.length}:${captures.length}:${scopes
      .map(({ bodyStart }) => bodyStart)
      .join(',')}`,
  };
}
