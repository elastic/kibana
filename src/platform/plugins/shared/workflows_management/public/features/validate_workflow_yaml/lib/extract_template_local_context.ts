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
import {
  type EnrichedTemplate,
  type ForLoopScope,
  getMaxTokenEnd,
  parseAssignVariableName,
  parseCaptureVariableName,
  parseForCollectionPath,
  visitChildren,
} from '../../../shared/lib/template_local_context_shared';

export interface TemplateLocalContext {
  assignCaptureNames: string[];
  forLoopScopes: ForLoopScope[];
}

/**
 * Extracts template-local variable definitions and for-loop scopes from a Liquid
 * template string. Used to extend workflow context for validation and autocomplete
 * so that assign/capture/for-loop variables are recognized.
 *
 * Uses the LiquidJS parser; on parse error returns empty context so the editor
 * stays usable (e.g. when the user is mid-edit).
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
    return { assignCaptureNames: [], forLoopScopes: [] };
  }
  try {
    const templates = parseTemplateString(templateString);
    return extractFromTemplates(templates, templateString, offsetInTemplate);
  } catch {
    return { assignCaptureNames: [], forLoopScopes: [] };
  }
}

function processTag(
  tag: EnrichedTemplate,
  token: Token & { args?: string },
  beforeOffset: number,
  assignCaptureNames: Set<string>,
  forLoopScopes: ForLoopScope[]
): void {
  if (tag.name === 'assign') {
    const args = tag.token?.args ?? '';
    const varName = parseAssignVariableName(args);
    if (varName && token.end <= beforeOffset) {
      assignCaptureNames.add(varName);
    }
  } else if (tag.name === 'capture') {
    const args = tag.token?.args ?? '';
    const varName = parseCaptureVariableName(args);
    const captureBodyEnd = getMaxTokenEnd(tag.templates ?? []);
    if (varName && captureBodyEnd <= beforeOffset) {
      assignCaptureNames.add(varName);
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

function extractFromTemplates(
  templates: Template[],
  _input: string,
  beforeOffset: number
): TemplateLocalContext {
  const assignCaptureNames = new Set<string>();
  const forLoopScopes: ForLoopScope[] = [];

  function visit(tpl: EnrichedTemplate) {
    const token = tpl.token;
    if (!token || typeof token.begin !== 'number' || typeof token.end !== 'number') {
      return;
    }
    if (typeof tpl.name === 'string') {
      processTag(tpl, token, beforeOffset, assignCaptureNames, forLoopScopes);
    }
    visitChildren(tpl, visit);
  }

  for (const tpl of templates) {
    visit(tpl satisfies EnrichedTemplate);
  }

  return {
    assignCaptureNames: Array.from(assignCaptureNames),
    forLoopScopes,
  };
}
