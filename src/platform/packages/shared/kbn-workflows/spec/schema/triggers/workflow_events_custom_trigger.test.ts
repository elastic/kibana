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
});
