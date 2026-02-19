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
import { parseTemplateString } from '../../../shared/lib/liquid_parse_cache';

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
}

export interface TemplateLocalContext {
  /** Assign variables with RHS for type inference. */
  readonly assignVars: readonly AssignVariable[];
  /** Capture variable names; capture output is always string. */
  readonly captureNames: readonly string[];
  readonly forLoopScopes: readonly ForLoopScope[];
}

const EMPTY_CONTEXT: TemplateLocalContext = Object.freeze({
  assignVars: [],
  captureNames: [],
  forLoopScopes: [],
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

// ---------------------------------------------------------------------------
// AST walk
// ---------------------------------------------------------------------------

interface WalkAccumulator {
  assignVars: AssignVariable[];
  captureNames: Set<string>;
  forLoopScopes: ForLoopScope[];
}

function walkTemplates(templates: Template[], beforeOffset: number, acc: WalkAccumulator): void {
  for (const tpl of templates) {
    const { token } = tpl;
    const children = tpl.children ? resolveChildren(tpl) : [];

    if (token && typeof token.begin === 'number' && typeof token.end === 'number') {
      if (isAssignTagType(tpl)) {
        const firstId = tpl.localScope()[Symbol.iterator]().next();
        const varName = firstId.done ? null : firstId.value.content;
        const rhs = parseAssignRhs(tpl.token.args);
        if (varName && token.end <= beforeOffset) {
          acc.assignVars.push({ name: varName, rhs: rhs ?? '' });
        }
      } else if (isCaptureTagType(tpl)) {
        const captureBodyEnd = getMaxTokenEnd(tpl.templates);
        if (captureBodyEnd <= beforeOffset) {
          acc.captureNames.add(tpl.variable);
        }
      } else if (isForTagType(tpl)) {
        const { variable: variableName, collection, templates: bodyTemplates } = tpl;
        const collectionPath = collection.getText();
        const bodyStart = token.end;
        const bodyEnd = getMaxTokenEnd(bodyTemplates);
        if (variableName && bodyEnd >= bodyStart) {
          acc.forLoopScopes.push({
            variableName,
            bodyStart,
            bodyEnd,
            collectionPath: collectionPath !== '' ? collectionPath : undefined,
          });
        }
      }
    }

    if (children.length > 0) {
      walkTemplates(children, beforeOffset, acc);
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
export function getTemplateLocalContext(
  templateString: string,
  offsetInTemplate: number
): TemplateLocalContext {
  if (!templateString.includes('{%')) {
    return EMPTY_CONTEXT;
  }
  try {
    const templates = parseTemplateString(templateString);
    const acc: WalkAccumulator = {
      assignVars: [],
      captureNames: new Set<string>(),
      forLoopScopes: [],
    };

    walkTemplates(templates, offsetInTemplate, acc);

    return {
      assignVars: acc.assignVars,
      captureNames: Array.from(acc.captureNames),
      forLoopScopes: acc.forLoopScopes,
    };
  } catch {
    return EMPTY_CONTEXT;
  }
}
