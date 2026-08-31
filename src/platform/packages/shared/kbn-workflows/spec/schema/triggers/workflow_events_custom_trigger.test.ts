/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTriggerSchema } from '.';

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
  const triggerSchema = getTriggerSchema([
    { id: 'inboundWebhook.received', requiresConnectorId: true },
    'cases.updated',
  ]);

  it('accepts a non-empty connector-id', () => {
    const result = triggerSchema.safeParse({
      type: 'inboundWebhook.received',
      'connector-id': 'webhook-1',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(
        expect.objectContaining({
          type: 'inboundWebhook.received',
          'connector-id': 'webhook-1',
        })
      );
    }
  });

  it('accepts connector-id with optional on.condition', () => {
    const result = triggerSchema.safeParse({
      type: 'inboundWebhook.received',
      'connector-id': 'webhook-1',
      on: { condition: 'event.body.action: created' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing connector-id', () => {
    const result = triggerSchema.safeParse({ type: 'inboundWebhook.received' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty or whitespace-only connector-id', () => {
    expect(
      triggerSchema.safeParse({
        type: 'inboundWebhook.received',
        'connector-id': '',
      }).success
    ).toBe(false);
    expect(
      triggerSchema.safeParse({
        type: 'inboundWebhook.received',
        'connector-id': '   ',
      }).success
    ).toBe(false);
  });

  it('leaves cases.updated and built-in triggers without a connector-id requirement', () => {
    expect(triggerSchema.safeParse({ type: 'cases.updated' }).success).toBe(true);
    expect(triggerSchema.safeParse({ type: 'manual' }).success).toBe(true);
    expect(triggerSchema.safeParse({ type: 'alert' }).success).toBe(true);
    expect(triggerSchema.safeParse({ type: 'scheduled', with: { every: '5m' } }).success).toBe(
      true
    );
  });
});
