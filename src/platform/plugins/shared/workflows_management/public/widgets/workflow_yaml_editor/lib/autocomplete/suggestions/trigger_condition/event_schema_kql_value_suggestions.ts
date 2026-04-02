/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeQuotes, fromKueryExpression, type KueryNode } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { type QuerySuggestion, QuerySuggestionTypes } from '@kbn/kql/public';
import { EVENT_FIELD_PREFIX } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';
import { getSchemaAtPath } from '../../../../../../../common/lib/zod';

/** Must match {@link setupKqlQuerySuggestionProvider} / KQL grammar cursor token. */
export const KQL_PARSE_CURSOR_SYMBOL = '@kuery-cursor@';

/** Limits union fan-out so completion value sets and recursion stay bounded on huge unions. */
const MAX_UNION_BRANCHES = 24;

/** Stops unwrapping optional/nullable/default wrappers after this many steps (pathological schemas). */
const MAX_ZOD_LEAF_UNWRAP_ITERATIONS = 16;

/** Max nesting depth when collecting enumerable values from unions/literals (avoids runaway recursion). */
const MAX_ENUM_COLLECT_DEPTH = 14;

const SCHEMA_VALUE_DESCRIPTION = i18n.translate(
  'workflowsManagement.triggerConditionKql.schemaValueSuggestionDescription',
  {
    defaultMessage: 'From trigger event schema',
  }
);

function unwrapZodLeaf(schema: z.ZodType): z.ZodType {
  let current: z.ZodType = schema;
  for (let i = 0; i < MAX_ZOD_LEAF_UNWRAP_ITERATIONS; i++) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      current = current.unwrap() as z.ZodType;
    } else if (current instanceof z.ZodDefault) {
      current = current.unwrap() as z.ZodType;
    } else {
      break;
    }
  }
  return current;
}

function collectRawEnumerableValues(
  schema: z.ZodType | null | undefined,
  out: Set<string | number | boolean>,
  depth: number
): void {
  if (!schema || depth > MAX_ENUM_COLLECT_DEPTH) {
    return;
  }

  const s = unwrapZodLeaf(schema);

  if (s instanceof z.ZodLiteral) {
    const v = s.value;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out.add(v);
    }
    return;
  }

  if (s instanceof z.ZodEnum) {
    for (const opt of s.options) {
      if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
        out.add(opt);
      }
    }
    return;
  }

  // Zod v3 exposes `ZodNativeEnum`; v4 merges `z.nativeEnum` into `ZodEnum`. Guard ctor so `instanceof` is safe.
  const zodStatics = z as unknown as { ZodNativeEnum?: new (...args: never[]) => unknown };
  if (zodStatics.ZodNativeEnum !== undefined && s instanceof zodStatics.ZodNativeEnum) {
    const entries = (s as { enum?: Record<string, string | number | boolean> }).enum;
    if (entries && typeof entries === 'object') {
      for (const opt of Object.values(entries)) {
        if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
          out.add(opt);
        }
      }
    }
    return;
  }

  const enumDef = (s as { def?: { type?: unknown; entries?: Record<string, unknown> } }).def;
  if (
    enumDef?.type === 'enum' &&
    enumDef.entries !== undefined &&
    typeof enumDef.entries === 'object'
  ) {
    for (const opt of Object.values(enumDef.entries)) {
      if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
        out.add(opt);
      }
    }
    return;
  }

  if (s instanceof z.ZodBoolean) {
    out.add(true);
    out.add(false);
    return;
  }

  if (s instanceof z.ZodUnion) {
    const options = s.options.slice(0, MAX_UNION_BRANCHES);
    for (const opt of options) {
      collectRawEnumerableValues(opt as z.ZodType, out, depth + 1);
    }
  }
}

function formatKqlValueSuggestionText(raw: string | number | boolean): string {
  if (typeof raw === 'boolean') {
    return String(raw);
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }
  return `"${escapeQuotes(String(raw))}"`;
}

function fullKqlFieldNameFromCursorNode(cursorNode: KueryNode): string | null {
  const fieldName = cursorNode.fieldName as string | undefined;
  if (!fieldName || typeof fieldName !== 'string') {
    return null;
  }
  const nestedPath = cursorNode.nestedPath as string | undefined;
  return nestedPath ? `${nestedPath}.${fieldName}` : fieldName;
}

export function eventPayloadPathFromKqlField(
  fullFieldName: string,
  fieldPrefix: string = EVENT_FIELD_PREFIX
): string | null {
  const normalized = fieldPrefix.endsWith('.') ? fieldPrefix : `${fieldPrefix}.`;
  if (!fullFieldName.startsWith(normalized)) {
    return null;
  }
  const rest = fullFieldName.slice(normalized.length).trim();
  return rest.length > 0 ? rest : null;
}

export function mergeTriggerEventSchemaValueSuggestions(
  eventSchema: z.ZodType,
  kql: string,
  selectionStart: number,
  selectionEnd: number,
  kqlSuggestions: QuerySuggestion[]
): QuerySuggestion[] {
  const hasSubstantiveKqlValueSuggestion = kqlSuggestions.some((s) => {
    if (s.type !== QuerySuggestionTypes.Value) {
      return false;
    }
    const raw = typeof s.text === 'string' ? s.text : String(s.text);
    return raw.trim().length > 0;
  });
  if (hasSubstantiveKqlValueSuggestion) {
    return kqlSuggestions;
  }

  let cursorNode: KueryNode;
  try {
    const cursoredQuery = `${kql.slice(0, selectionStart)}${KQL_PARSE_CURSOR_SYMBOL}${kql.slice(
      selectionEnd
    )}`;
    cursorNode = fromKueryExpression(cursoredQuery, {
      cursorSymbol: KQL_PARSE_CURSOR_SYMBOL,
      parseCursor: true,
    });
  } catch {
    return kqlSuggestions;
  }

  const suggestionTypes = cursorNode.suggestionTypes as string[] | undefined;
  if (!suggestionTypes?.includes('value')) {
    return kqlSuggestions;
  }

  const fullField = fullKqlFieldNameFromCursorNode(cursorNode);
  if (!fullField) {
    return kqlSuggestions;
  }

  const payloadPath = eventPayloadPathFromKqlField(fullField);
  if (!payloadPath) {
    return kqlSuggestions;
  }

  const { schema: fieldSchema } = getSchemaAtPath(eventSchema, payloadPath, { partial: true });
  if (!fieldSchema) {
    return kqlSuggestions;
  }

  const rawValues = new Set<string | number | boolean>();
  collectRawEnumerableValues(fieldSchema, rawValues, 0);
  if (rawValues.size === 0) {
    return kqlSuggestions;
  }

  const filterQuery = `${(cursorNode.prefix as string) ?? ''}${(cursorNode.suffix as string) ?? ''}`
    .trim()
    .toLowerCase();

  const filteredRaw = [...rawValues].filter((raw) => {
    if (!filterQuery) {
      return true;
    }
    return String(raw).toLowerCase().includes(filterQuery);
  });

  if (filteredRaw.length === 0) {
    return kqlSuggestions;
  }

  const start = cursorNode.start as number;
  const end = cursorNode.end as number;
  if (typeof start !== 'number' || typeof end !== 'number') {
    return kqlSuggestions;
  }

  const extra: QuerySuggestion[] = filteredRaw.map((raw) => ({
    type: QuerySuggestionTypes.Value,
    text: formatKqlValueSuggestionText(raw),
    start,
    end,
    description: SCHEMA_VALUE_DESCRIPTION,
  }));

  return [...kqlSuggestions, ...extra];
}
