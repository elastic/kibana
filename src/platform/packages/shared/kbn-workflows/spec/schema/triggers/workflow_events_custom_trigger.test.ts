/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCustomTriggerZodSchema, getTriggerSchema, toCustomTriggerSchemaConfigs } from '.';
import { CONNECTOR_ID_MAX_LENGTH, IF_CONDITION_MAX_LENGTH } from '../../../common/constants';

describe('custom trigger on.workflowEvents', () => {
  const triggerSchema = getTriggerSchema(['cases.updated']);

  it('accepts ignore, allow-all, and avoid-loop', () => {
    for (const workflowEvents of ['ignore', 'allow-all', 'avoid-loop'] as const) {
      const result = triggerSchema.safeParse({
        type: 'cases.updated',
        on: { workflowEvents },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(
          expect.objectContaining({ type: 'cases.updated', on: { workflowEvents } })
        );
      }
    }
  });

  it('accepts omitted on and empty on', () => {
    expect(triggerSchema.safeParse({ type: 'cases.updated' }).success).toBe(true);
    expect(triggerSchema.safeParse({ type: 'cases.updated', on: {} }).success).toBe(true);
  });

  it('rejects invalid workflowEvents string', () => {
    const result = triggerSchema.safeParse({
      type: 'cases.updated',
      on: { workflowEvents: 'invalidMode' },
    });
    expect(result.success).toBe(false);
  });

  it('does not require connector-id when the flag is omitted', () => {
    expect(triggerSchema.safeParse({ type: 'cases.updated' }).success).toBe(true);
  });
});

describe('custom trigger requiresConnectorId', () => {
  const connectorEventTriggerId = 'example.connector_event';
  const triggerSchema = getTriggerSchema([
    { id: connectorEventTriggerId, requiresConnectorId: true },
    'cases.updated',
  ]);

  it('accepts a non-empty connector-id', () => {
    const result = triggerSchema.safeParse({
      type: connectorEventTriggerId,
      'connector-id': 'webhook-1',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(
        expect.objectContaining({
          type: connectorEventTriggerId,
          'connector-id': 'webhook-1',
        })
      );
    }
  });

  it('accepts connector-id with optional on.condition', () => {
    const result = triggerSchema.safeParse({
      type: connectorEventTriggerId,
      'connector-id': 'webhook-1',
      on: { condition: 'event.body.action: created' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing connector-id', () => {
    const result = triggerSchema.safeParse({ type: connectorEventTriggerId });
    expect(result.success).toBe(false);
  });

  it('rejects an empty or whitespace-only connector-id', () => {
    expect(
      triggerSchema.safeParse({
        type: connectorEventTriggerId,
        'connector-id': '',
      }).success
    ).toBe(false);
    expect(
      triggerSchema.safeParse({
        type: connectorEventTriggerId,
        'connector-id': '   ',
      }).success
    ).toBe(false);
  });

  it('rejects a connector-id with leading or trailing whitespace', () => {
    expect(
      triggerSchema.safeParse({
        type: connectorEventTriggerId,
        'connector-id': ' webhook-1',
      }).success
    ).toBe(false);
    expect(
      triggerSchema.safeParse({
        type: connectorEventTriggerId,
        'connector-id': 'webhook-1 ',
      }).success
    ).toBe(false);
  });

  it('rejects a max-length connector-id with trailing whitespace', () => {
    expect(
      triggerSchema.safeParse({
        type: connectorEventTriggerId,
        'connector-id': `${'x'.repeat(CONNECTOR_ID_MAX_LENGTH)} `,
      }).success
    ).toBe(false);
  });

  it('rejects a connector-id longer than CONNECTOR_ID_MAX_LENGTH', () => {
    expect(
      triggerSchema.safeParse({
        type: connectorEventTriggerId,
        'connector-id': 'x'.repeat(CONNECTOR_ID_MAX_LENGTH + 1),
      }).success
    ).toBe(false);
    expect(
      triggerSchema.safeParse({
        type: connectorEventTriggerId,
        'connector-id': 'x'.repeat(CONNECTOR_ID_MAX_LENGTH),
      }).success
    ).toBe(true);
  });

  it('leaves cases.updated and built-in triggers without a connector-id requirement', () => {
    expect(triggerSchema.safeParse({ type: 'cases.updated' }).success).toBe(true);
    expect(triggerSchema.safeParse({ type: 'manual' }).success).toBe(true);
    expect(triggerSchema.safeParse({ type: 'alert' }).success).toBe(true);
    expect(triggerSchema.safeParse({ type: 'scheduled', with: { every: '5m' } }).success).toBe(
      true
    );
  });

  it('rejects on.condition longer than IF_CONDITION_MAX_LENGTH', () => {
    expect(
      triggerSchema.safeParse({
        type: connectorEventTriggerId,
        'connector-id': 'webhook-1',
        on: { condition: 'a'.repeat(IF_CONDITION_MAX_LENGTH + 1) },
      }).success
    ).toBe(false);
    expect(
      triggerSchema.safeParse({
        type: connectorEventTriggerId,
        'connector-id': 'webhook-1',
        on: { condition: 'a'.repeat(IF_CONDITION_MAX_LENGTH) },
      }).success
    ).toBe(true);
  });
});

describe('toCustomTriggerSchemaConfigs', () => {
  it('dedupes ids and keeps the last requiresConnectorId', () => {
    expect(
      toCustomTriggerSchemaConfigs([
        { id: 'example.connector_event' },
        { id: 'cases.updated' },
        { id: 'example.connector_event', requiresConnectorId: true },
      ])
    ).toEqual([
      { id: 'example.connector_event', requiresConnectorId: true },
      { id: 'cases.updated', requiresConnectorId: undefined },
    ]);
  });
});

describe('getTriggerSchema id dedupe', () => {
  it('keeps the last requiresConnectorId when the same id is passed twice', () => {
    const triggerId = 'example.connector_event';
    const triggerSchema = getTriggerSchema([
      triggerId,
      { id: triggerId, requiresConnectorId: true },
    ]);

    expect(triggerSchema.safeParse({ type: triggerId }).success).toBe(false);
    expect(triggerSchema.safeParse({ type: triggerId, 'connector-id': 'webhook-1' }).success).toBe(
      true
    );
  });
});

describe('getCustomTriggerZodSchema', () => {
  it('requires connector-id when the flag is set', () => {
    const schema = getCustomTriggerZodSchema({
      id: 'example.connector_event',
      requiresConnectorId: true,
    });

    expect(schema.safeParse({ type: 'example.connector_event' }).success).toBe(false);
    expect(
      schema.safeParse({ type: 'example.connector_event', 'connector-id': 'webhook-1' }).success
    ).toBe(true);
  });
});
