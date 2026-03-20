/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { createSidebarStore } from './create_sidebar_store';

describe('createSidebarStore', () => {
  const testSchema = z.object({
    count: z.number().default(0),
    name: z.string().default(''),
  });

  it('returns config with schema and actions', () => {
    const store = createSidebarStore({
      schema: testSchema,
      actions: (set, get, sidebar) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
        setName: (name: string) => set({ name }),
        incrementAndOpen: () => {
          set((s) => ({ count: s.count + 1 }));
          sidebar.open();
        },
      }),
    });

    expect(store.schema).toBe(testSchema);
    expect(typeof store.actions).toBe('function');
  });

  it('returns the exact config object passed in', () => {
    const actionsFactory = (set: any, get: any, sidebar: any) => ({
      increment: () => {},
      setName: () => {},
    });

    const store = createSidebarStore({
      schema: testSchema,
      actions: actionsFactory,
    });

    expect(store.actions).toBe(actionsFactory);
  });
});
