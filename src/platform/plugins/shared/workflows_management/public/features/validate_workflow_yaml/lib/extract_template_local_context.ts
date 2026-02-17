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

import { parseTemplateString } from '../../../shared/lib/liquid_parse_cache';
import {
  extractTemplateLocalContextFromTemplates,
  type ForLoopScope,
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
    const full = extractTemplateLocalContextFromTemplates(templates, offsetInTemplate);
    return {
      assignCaptureNames: full.assignCaptureNames,
      forLoopScopes: full.forLoopScopes,
    };
  } catch {
    return { assignCaptureNames: [], forLoopScopes: [] };
  }
}
