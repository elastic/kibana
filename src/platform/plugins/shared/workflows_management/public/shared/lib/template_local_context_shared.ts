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
