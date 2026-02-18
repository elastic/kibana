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
 * Uses the LiquidJS parser so that scope and ranges are accurate even with
 * nested tags and invalid-looking strings inside tags.
 */

import type { Template, Token } from 'liquidjs';
import { parseTemplateString } from '../../../shared/lib/liquid_parse_cache';

/**
 * Shared types and helpers for extracting template-local context from Liquid
 * template strings (assign/capture/for). Used by workflow_context and
 * validate_workflow_yaml feature modules.
 */

export interface AssignVariable {
  name: string;
  /** Right-hand side of the assign (e.g. "steps.x.outputs.value" or "42"). Used to infer type. */
  rhs: string;
}

export interface ForLoopScope {
  variableName: string;
  bodyStart: number;
  bodyEnd: number;
  /** Resolved path of the collection (e.g. "steps.x.outputs.items") for schema lookup, when present in {% for var in collection %}. */
  collectionPath?: string;
}

export type EnrichedTemplate = Template & {
  name?: string;
  token?: Token & { args?: string };
  variable?: string;
  templates?: Template[];
  elseTemplates?: Template[];
  branches?: { templates?: Template[] }[];
};

const ASSIGN_VARIABLE_NAME_REGEX = /^\w+$/;

export function parseAssignVariableName(args: string): string | null {
  const trimmed = args.trim();
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) return null;
  const beforeEq = trimmed.slice(0, eqIndex).trim();
  const match = beforeEq.match(ASSIGN_VARIABLE_NAME_REGEX);
  return match ? match[0] : null;
}

export function parseCaptureVariableName(args: string): string | null {
  const first = args.trim().split(/\s+/)[0];
  return first && ASSIGN_VARIABLE_NAME_REGEX.test(first) ? first : null;
}

export function parseAssignRhs(args: string): string | null {
  const trimmed = args.trim();
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) return null;
  return trimmed.slice(eqIndex + 1).trim() || null;
}

/** Extract collection path from for-tag args (e.g. "item in steps.x.outputs.items" -> "steps.x.outputs.items"). */
export function parseForCollectionPath(args: string): string | null {
  const afterIn = args
    .trim()
    .split(/\s+in\s+/)[1]
    ?.trim();
  if (!afterIn) return null;
  const firstToken = afterIn.split(/\s+/)[0];
  return firstToken && firstToken.length > 0 ? firstToken : null;
}

function getMaxTokenEnd(templates: EnrichedTemplate[]): number {
  let maxEnd = 0;
  for (const tpl of templates) {
    const token = tpl.token;
    if (token && typeof token.end === 'number') {
      maxEnd = Math.max(maxEnd, token.end);
    }
    const tag = tpl;
    if (Array.isArray(tag.templates)) {
      maxEnd = Math.max(maxEnd, getMaxTokenEnd(tag.templates));
    }
  }
  return maxEnd;
}

function visitChildren(tag: EnrichedTemplate, visit: (tpl: EnrichedTemplate) => void): void {
  if (Array.isArray(tag.templates)) {
    for (const child of tag.templates) {
      visit(child);
    }
  }
  if (Array.isArray(tag.elseTemplates)) {
    for (const child of tag.elseTemplates) {
      visit(child);
    }
  }
  if (Array.isArray(tag.branches)) {
    for (const branch of tag.branches) {
      if (Array.isArray(branch.templates)) {
        for (const child of branch.templates) {
          visit(child);
        }
      }
    }
  }
}

/**
 * Returns for-loop scopes that contain the given offset (for validation/autocomplete).
 * Inner loops come later in the array so that when merging into schema, inner wins.
 */
export function forLoopScopesContainingOffset(
  forLoopScopes: ForLoopScope[],
  offsetInTemplate: number
): ForLoopScope[] {
  return forLoopScopes.filter(
    (scope) => offsetInTemplate >= scope.bodyStart && offsetInTemplate < scope.bodyEnd
  );
}

/** Full template-local context: assign/capture names, assign RHS for type inference, for-loop scopes. */
export interface TemplateLocalContext {
  /** Names from both assign and capture (for backward compatibility). */
  assignCaptureNames: string[];
  /** Assign variables with RHS for type inference. */
  assignVars: AssignVariable[];
  /** Capture variable names; capture output is always string. */
  captureNames: string[];
  forLoopScopes: ForLoopScope[];
}

function processTag(
  tag: EnrichedTemplate,
  token: Token & { args?: string },
  beforeOffset: number,
  assignVars: AssignVariable[],
  captureNames: Set<string>,
  forLoopScopes: ForLoopScope[]
): void {
  if (tag.name === 'assign') {
    const args = tag.token?.args ?? '';
    const varName = parseAssignVariableName(args);
    const rhs = parseAssignRhs(args);
    if (varName && token.end <= beforeOffset) {
      assignVars.push({ name: varName, rhs: rhs ?? '' });
    }
  } else if (tag.name === 'capture') {
    const args = tag.token?.args ?? '';
    const varName = parseCaptureVariableName(args);
    const captureBodyEnd = getMaxTokenEnd(tag.templates ?? []);
    if (varName && captureBodyEnd <= beforeOffset) {
      captureNames.add(varName);
    }
  } else if (tag.name === 'for') {
    const variableName = tag.variable ?? '';
    const args = tag.token?.args ?? '';
    const collectionPath = parseForCollectionPath(args);
    const bodyTemplates = tag.templates ?? [];
    const bodyStart = token.end;
    const bodyEnd = getMaxTokenEnd(bodyTemplates);
    if (variableName && bodyEnd >= bodyStart) {
      forLoopScopes.push({
        variableName,
        bodyStart,
        bodyEnd,
        collectionPath: collectionPath ?? undefined,
      });
    }
  }
}

/**
 * Extracts template-local variable definitions and for-loop scopes from already-parsed
 * Liquid templates. Callers should parse the template string (e.g. via parseTemplateString)
 * and pass the result here. Used by workflow_context and validate_workflow_yaml.
 */
function extractTemplateLocalContextFromTemplates(
  templates: Template[],
  beforeOffset: number
): TemplateLocalContext {
  const assignVars: AssignVariable[] = [];
  const captureNames = new Set<string>();
  const forLoopScopes: ForLoopScope[] = [];

  function visit(tpl: EnrichedTemplate) {
    const token = tpl.token;
    if (!token || typeof token.begin !== 'number' || typeof token.end !== 'number') {
      return;
    }
    if (typeof tpl.name === 'string') {
      processTag(tpl, token, beforeOffset, assignVars, captureNames, forLoopScopes);
    }
    visitChildren(tpl, visit);
  }

  for (const tpl of templates) {
    visit(tpl satisfies EnrichedTemplate);
  }

  const captureNamesList = Array.from(captureNames);
  const assignCaptureNames = [...assignVars.map((a) => a.name), ...captureNamesList];

  return {
    assignCaptureNames,
    assignVars,
    captureNames: captureNamesList,
    forLoopScopes,
  };
}
const EMPTY_CONTEXT: TemplateLocalContext = {
  assignCaptureNames: [],
  assignVars: [],
  captureNames: [],
  forLoopScopes: [],
};

/**
 * Extracts template-local variable definitions and for-loop scopes from a Liquid
 * template string. Used to extend workflow context for validation and autocomplete
 * so that assign/capture/for-loop variables are recognized.
 *
 * Uses the LiquidJS parser; on parse error returns empty context so the editor
 * stays usable (e.g. when the user is mid-edit).
 *
 * Known limitations:
 * - `{% increment %}` and `{% decrement %}` tags are not extracted. Variables
 *   introduced by these tags will still be reported as unknown.
 * - Assigns inside conditional branches (`{% if %}`/`{% else %}`) are treated
 *   as unconditionally available once their tag offset is before the cursor,
 *   even though the branch might not execute at runtime.
 *
 * @param templateString - Full content of the scalar (e.g. a step's message field)
 * @param offsetInTemplate - Character offset inside the template (e.g. position of a variable reference or cursor)
 * @returns assignCaptureNames: names defined by assign/capture before the offset; forLoopScopes: all for-loop body ranges (caller filters to those containing offsetInTemplate)
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
    return extractTemplateLocalContextFromTemplates(templates, offsetInTemplate);
  } catch {
    return EMPTY_CONTEXT;
  }
}
