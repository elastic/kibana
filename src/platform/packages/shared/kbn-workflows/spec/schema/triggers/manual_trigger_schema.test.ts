/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getTriggerSchema, MANUAL_WORKFLOW_EVENT_TYPE_MAX_LENGTH, ManualTriggerSchema } from '.';

const collectEnumValues = (value: unknown): string[] => {
  if (!value || typeof value !== 'object') {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectEnumValues);
  }

  const record = value as Record<string, unknown>;
  const values = Array.isArray(record.enum)
    ? record.enum.filter((item): item is string => typeof item === 'string')
    : [];
  return [...values, ...Object.values(record).flatMap(collectEnumValues)];
};

describe('manual trigger eventType', () => {
  it('keeps existing manual workflows valid', () => {
    expect(ManualTriggerSchema.safeParse({ type: 'manual' }).success).toBe(true);
  });

  it('accepts a bounded optional eventType', () => {
    expect(
      ManualTriggerSchema.safeParse({ type: 'manual', eventType: 'cases.updated' }).success
    ).toBe(true);
    expect(ManualTriggerSchema.safeParse({ type: 'manual', eventType: '' }).success).toBe(false);
    expect(
      ManualTriggerSchema.safeParse({
        type: 'manual',
        eventType: 'a'.repeat(MANUAL_WORKFLOW_EVENT_TYPE_MAX_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('surfaces registered event ids in generated JSON schemas for completion', () => {
    const schema = getTriggerSchema([], ['cases.updated', 'alerts.created']);
    const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' });

    expect(schema.safeParse({ type: 'manual', eventType: 'cases.updated' }).success).toBe(true);
    expect(collectEnumValues(jsonSchema)).toEqual(
      expect.arrayContaining(['cases.updated', 'alerts.created'])
    );
  });
});
