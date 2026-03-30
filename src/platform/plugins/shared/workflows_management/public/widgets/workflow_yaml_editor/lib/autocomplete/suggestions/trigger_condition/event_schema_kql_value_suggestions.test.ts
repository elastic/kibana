/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type QuerySuggestion, QuerySuggestionTypes } from '@kbn/kql/public';
import { z } from '@kbn/zod/v4';
import {
  eventPayloadPathFromKqlField,
  mergeTriggerEventSchemaValueSuggestions,
} from './event_schema_kql_value_suggestions';

describe('eventPayloadPathFromKqlField', () => {
  it('strips event. prefix from KQL field paths', () => {
    expect(eventPayloadPathFromKqlField('event.severity', 'event.')).toBe('severity');
    expect(eventPayloadPathFromKqlField('event.cases.id', 'event.')).toBe('cases.id');
  });

  it('returns null when the field is not under the prefix', () => {
    expect(eventPayloadPathFromKqlField('severity', 'event.')).toBeNull();
    expect(eventPayloadPathFromKqlField('other.severity', 'event.')).toBeNull();
  });
});

describe('mergeTriggerEventSchemaValueSuggestions', () => {
  const eventSchema = z.object({
    severity: z.enum(['low', 'medium', 'high']),
    enabled: z.boolean(),
    mode: z.union([z.literal('a'), z.literal('b')]),
    message: z.string(),
  });

  it('adds quoted enum values when cursor is in a value position and KQL returns no values', () => {
    const kql = 'event.severity: ';
    const selectionStart = kql.length;
    const selectionEnd = selectionStart;
    const base: QuerySuggestion[] = [
      { type: QuerySuggestionTypes.Field, text: 'event.severity ', start: 0, end: 0 },
    ];

    const merged = mergeTriggerEventSchemaValueSuggestions(
      eventSchema,
      kql,
      selectionStart,
      selectionEnd,
      base
    );

    const valueSuggestions = merged.filter((s) => s.type === QuerySuggestionTypes.Value);
    expect(valueSuggestions.map((s) => s.text).sort()).toEqual(['"high"', '"low"', '"medium"']);
    expect(valueSuggestions.every((s) => typeof s.description === 'string')).toBe(true);
  });

  it('merges when KQL only returned empty Value suggestions (still offer schema enums)', () => {
    const kql = 'event.severity: ';
    const selectionStart = kql.length;
    const base: QuerySuggestion[] = [
      { type: QuerySuggestionTypes.Value, text: '', start: selectionStart, end: selectionStart },
      { type: QuerySuggestionTypes.Value, text: '   ', start: selectionStart, end: selectionStart },
    ];

    const merged = mergeTriggerEventSchemaValueSuggestions(
      eventSchema,
      kql,
      selectionStart,
      selectionStart,
      base
    );

    expect(merged).toHaveLength(5);
    const appendedFromSchema = merged.slice(2);
    expect(appendedFromSchema.map((s) => s.text).sort()).toEqual(['"high"', '"low"', '"medium"']);
    expect(appendedFromSchema.every((s) => typeof s.description === 'string')).toBe(true);
  });

  it('does not merge when KQL already returned value suggestions', () => {
    const kql = 'event.severity: ';
    const selectionStart = kql.length;
    const base: QuerySuggestion[] = [
      {
        type: QuerySuggestionTypes.Value,
        text: '"from-es"',
        start: selectionStart,
        end: selectionStart,
      },
    ];

    const merged = mergeTriggerEventSchemaValueSuggestions(
      eventSchema,
      kql,
      selectionStart,
      selectionStart,
      base
    );

    expect(merged).toEqual(base);
  });

  it('filters enum values by partial prefix/suffix around the cursor', () => {
    const kql = 'event.severity: me';
    const selectionStart = kql.length;
    const base: QuerySuggestion[] = [];

    const merged = mergeTriggerEventSchemaValueSuggestions(
      eventSchema,
      kql,
      selectionStart,
      selectionStart,
      base
    );

    const valueSuggestions = merged.filter((s) => s.type === QuerySuggestionTypes.Value);
    expect(valueSuggestions.map((s) => s.text)).toEqual(['"medium"']);
  });

  it('suggests boolean literals for boolean fields', () => {
    const kql = 'event.enabled: ';
    const selectionStart = kql.length;
    const merged = mergeTriggerEventSchemaValueSuggestions(
      eventSchema,
      kql,
      selectionStart,
      selectionStart,
      []
    );
    const valueSuggestions = merged.filter((s) => s.type === QuerySuggestionTypes.Value);
    expect(valueSuggestions.map((s) => s.text).sort()).toEqual(['false', 'true']);
  });

  it('returns the input list when not in a value suggestion context', () => {
    const kql = 'event.';
    const selectionStart = kql.length;
    const base: QuerySuggestion[] = [
      { type: QuerySuggestionTypes.Field, text: 'x', start: 0, end: 0 },
    ];
    const merged = mergeTriggerEventSchemaValueSuggestions(
      eventSchema,
      kql,
      selectionStart,
      selectionStart,
      base
    );
    expect(merged).toEqual(base);
  });

  it('collects values from z.nativeEnum fields', () => {
    enum NativeKind {
      alpha = 'alpha',
      beta = 'beta',
    }
    const nativeEnumSchema = z.object({
      kind: z.nativeEnum(NativeKind),
    });

    const kql = 'event.kind: ';
    const selectionStart = kql.length;
    const merged = mergeTriggerEventSchemaValueSuggestions(
      nativeEnumSchema,
      kql,
      selectionStart,
      selectionStart,
      []
    );

    const valueSuggestions = merged.filter((s) => s.type === QuerySuggestionTypes.Value);
    expect(valueSuggestions.map((s) => s.text).sort()).toEqual(['"alpha"', '"beta"']);
  });
});
