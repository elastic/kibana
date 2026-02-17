/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared types and helpers for extracting template-local context from Liquid
 * template strings (assign/capture/for). Used by workflow_context and
 * validate_workflow_yaml feature modules.
 */

import type { Template, Token } from 'liquidjs';

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

export function getMaxTokenEnd(templates: EnrichedTemplate[]): number {
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

export function visitChildren(tag: EnrichedTemplate, visit: (tpl: EnrichedTemplate) => void): void {
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
export function extractTemplateLocalContextFromTemplates(
  templates: Template[],
  beforeOffset: number
): TemplateLocalContext {
  const assignVars: AssignVariable[] = [];
  const captureNames = new Set<string>();
  const forLoopScopes: ForLoopScope[] = [];

  const visit = (tpl: EnrichedTemplate) => {
    const token = tpl.token;
    if (!token || typeof token.begin !== 'number' || typeof token.end !== 'number') {
      return;
    }
    if (typeof tpl.name === 'string') {
      processTag(tpl, token, beforeOffset, assignVars, captureNames, forLoopScopes);
    }
    visitChildren(tpl, visit);
  };

  for (const tpl of templates) {
    visit(tpl as EnrichedTemplate);
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
