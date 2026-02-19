/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { DynamicStepContextSchema } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import {
  forLoopScopesContainingOffset,
  getTemplateLocalContext,
} from './extract_template_local_context';
import { getForeachItemSchema } from './get_foreach_state_schema';
import { getScalarValueAtOffset } from '../../../../common/lib/yaml/get_scalar_value_at_offset';
import { getSchemaAtPath } from '../../../../common/lib/zod';

/** LiquidJS forloop object schema (index, index0, rindex, rindex0, first, last, length) */
const FORLOOP_SCHEMA = z.object({
  index: z.number(),
  index0: z.number(),
  rindex: z.number(),
  rindex0: z.number(),
  first: z.boolean(),
  last: z.boolean(),
  length: z.number(),
});

/** Matches a Liquid variable path (e.g. steps.x.outputs.value). */
const VARIABLE_PATH_REGEX = /^[\w.]+$/;

/** Matches a numeric literal. */
const NUMBER_LITERAL_REGEX = /^-?\d+(\.\d+)?$/;

function isExpressionBoolean(expression: string): boolean {
  return expression === 'true' || expression === 'false';
}

function isExpressionNumber(expression: string): boolean {
  return NUMBER_LITERAL_REGEX.test(expression);
}

function isExpressionString(expression: string): boolean {
  return (
    (expression.startsWith('"') && expression.endsWith('"')) ||
    (expression.startsWith("'") && expression.endsWith("'"))
  );
}

/**
 * Matches quoted strings (to skip them) or an unquoted pipe character.
 * The first two alternatives consume entire quoted strings so the pipe
 * in the capturing group can only match outside quotes.
 */
const QUOTED_OR_PIPE = /"[^"]*"|'[^']*'|(\|)/g;

/**
 * Strips Liquid filters from a RHS expression by finding the first `|` that is
 * not inside a quoted string. For example, `"a | b" | upcase` returns `"a | b"`.
 */
function stripFilters(rhs: string): string {
  const firstPipe = Array.from(rhs.matchAll(QUOTED_OR_PIPE)).find((m) => m[1] !== undefined);
  return firstPipe ? rhs.slice(0, firstPipe.index).trim() : rhs.trim();
}

/**
 * Infers a Zod schema for an assign RHS when possible. Uses path resolution,
 * number/string literals, or falls back to z.unknown().
 *
 * Known limitation: Liquid filters (e.g. `| size`, `| json_parse`) are stripped
 * before inference, so the inferred type reflects the pre-filter expression, not
 * the filter's output type. For example, `items | size` infers the type of
 * `items` (array) rather than `number`.
 */
function inferSchemaFromAssignRhs(
  baseSchema: typeof DynamicStepContextSchema,
  rhs: string
): z.ZodType {
  const expression = stripFilters(rhs);
  if (!expression) {
    return z.unknown();
  }
  if (isExpressionNumber(expression)) {
    return z.number();
  }
  if (isExpressionString(expression)) {
    return z.string();
  }
  if (isExpressionBoolean(expression)) {
    return z.boolean();
  }
  if (VARIABLE_PATH_REGEX.test(expression)) {
    try {
      const { schema } = getSchemaAtPath(baseSchema, expression);
      if (schema && !(schema instanceof z.ZodUnknown)) {
        return schema as z.ZodType;
      }
    } catch {
      // path invalid or not resolvable
    }
  }
  return z.unknown();
}

/**
 * Extends the workflow context schema with template-local variables (assign/capture
 * and for-loop scope) so that validation and autocomplete recognize them.
 */
export function extendContextWithTemplateLocals(
  baseSchema: typeof DynamicStepContextSchema,
  templateString: string,
  offsetInTemplate: number
): typeof DynamicStepContextSchema {
  const { assignVars, captureNames, forLoopScopes } = getTemplateLocalContext(
    templateString,
    offsetInTemplate
  );

  const extension: Record<string, z.ZodType> = {};
  for (const { name, rhs } of assignVars) {
    extension[name] = inferSchemaFromAssignRhs(baseSchema, rhs);
  }
  for (const name of captureNames) {
    extension[name] = z.string();
  }

  const activeScopes = forLoopScopesContainingOffset(forLoopScopes, offsetInTemplate);
  for (const { variableName, collectionPath } of activeScopes) {
    let itemSchema: z.ZodType = z.unknown();
    if (collectionPath) {
      try {
        const resolved = getForeachItemSchema(baseSchema, collectionPath);
        if (!(resolved instanceof z.ZodUnknown)) {
          itemSchema = resolved;
        }
      } catch {
        // keep z.unknown() when path is invalid or schema cannot be resolved
      }
    }
    extension[variableName] = itemSchema;
    extension.forloop = FORLOOP_SCHEMA;
  }

  if (Object.keys(extension).length === 0) {
    return baseSchema;
  }

  // Zod's .extend() returns a new ZodObject whose generic shape differs from DynamicStepContextSchema;
  // the cast is necessary because the added keys are dynamic and not reflected in the static type.
  return baseSchema.extend(extension) as typeof DynamicStepContextSchema;
}

/**
 * Resolves the scalar at the given YAML offset and, if it is a string (e.g. a
 * Liquid template), extends the base schema with template-local variables
 * (assign/capture/for-loop) valid at that offset. Used by both validation and
 * autocomplete so they share the same context logic.
 */
export function getContextSchemaWithTemplateLocals(
  yamlDocument: Document,
  offset: number,
  baseSchema: typeof DynamicStepContextSchema
): typeof DynamicStepContextSchema {
  const scalarNode = getScalarValueAtOffset(yamlDocument, offset);
  if (!scalarNode || typeof scalarNode.value !== 'string' || !scalarNode.range) {
    return baseSchema;
  }

  const scalarType = scalarNode.type;
  const templateString = scalarNode.value;
  const scalarStart = scalarNode.range[0];

  let offsetInTemplate: number;
  if (scalarType === 'BLOCK_LITERAL' || scalarType === 'BLOCK_FOLDED') {
    // Block scalars (| and >) have indentation stripping, so the document
    // offset doesn't map 1-to-1 to the value string. We use a best-effort
    // estimate: offset - scalarStart slightly overestimates (because the |/>
    // indicator line and per-line indentation are counted), which is safe —
    // it means assigns/captures defined before the variable are always included.
    offsetInTemplate = Math.min(offset - scalarStart, templateString.length);
  } else {
    // For quoted scalars, range[0] includes the opening quote character, but
    // value does not. Adjust by 1 so that offsetInTemplate aligns with the
    // value string positions rather than the raw YAML token positions.
    const isQuoted = scalarType === 'QUOTE_DOUBLE' || scalarType === 'QUOTE_SINGLE';
    const quoteAdjustment = isQuoted ? 1 : 0;
    offsetInTemplate = offset - scalarStart - quoteAdjustment;
  }

  if (offsetInTemplate < 0 || offsetInTemplate > templateString.length) {
    return baseSchema;
  }

  return extendContextWithTemplateLocals(baseSchema, templateString, offsetInTemplate);
}
