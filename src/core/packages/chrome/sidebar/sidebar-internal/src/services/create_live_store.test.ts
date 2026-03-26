/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { createSidebarStore, type SidebarContext } from '@kbn/core-chrome-sidebar';
import { createLiveStore, type SidebarStorage } from './create_live_store';

const createMockStorage = (
  initial: Record<string, unknown> = {}
): SidebarStorage & {
  get: jest.Mock;
  set: jest.Mock;
} => {
  const data = new Map(Object.entries(initial));
  return {
    get: jest.fn((key: string) => data.get(key) ?? null) as SidebarStorage['get'] & jest.Mock,
    set: jest.fn((key: string, value: unknown) => data.set(key, value)) as SidebarStorage['set'] &
      jest.Mock,
  };
};

const createMockContext = (): SidebarContext => ({
  open: jest.fn(),
  close: jest.fn(),
  isCurrent: jest.fn(() => false),
});

describe('createLiveStore', () => {
  const testSchema = z.object({
    count: z.number().default(0),
    name: z.string().default(''),
  });

  const createTestConfig = () =>
    createSidebarStore({
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

  type TestState = ReturnType<typeof createTestConfig>['types']['state'];

  describe('initialization', () => {
    it('uses schema defaults when storage is empty', () => {
      const config = createTestConfig();
      const storage = createMockStorage();
      const context = createMockContext();

      const live = createLiveStore('testApp', config, storage, context);

      expect(live.getState()).toEqual({ count: 0, name: '' });
      expect(storage.get).toHaveBeenCalledWith('testApp');
    });

    it('restores valid state from storage', () => {
      const config = createTestConfig();
      const storage = createMockStorage({ testApp: { count: 42, name: 'stored' } });
      const context = createMockContext();

      const live = createLiveStore('testApp', config, storage, context);

      expect(live.getState()).toEqual({ count: 42, name: 'stored' });
    });

    it('falls back to defaults when stored state is invalid', () => {
      const config = createTestConfig();
      const storage = createMockStorage({ testApp: { count: 'not-a-number', invalid: true } });
      const context = createMockContext();

      const live = createLiveStore('testApp', config, storage, context);

      expect(live.getState()).toEqual({ count: 0, name: '' });
    });
  });

  describe('set()', () => {
    it('merges partial state and persists to storage', () => {
      const config = createTestConfig();
      const storage = createMockStorage();
      const context = createMockContext();
      const live = createLiveStore('testApp', config, storage, context);

      // First update
      live.actions.setName('Alice');
      expect(live.getState()).toEqual({ count: 0, name: 'Alice' });
      expect(storage.set).toHaveBeenCalledWith('testApp', { count: 0, name: 'Alice' });

      // Second update preserves previous changes
      live.actions.increment();
      expect(live.getState()).toEqual({ count: 1, name: 'Alice' });
      expect(storage.set).toHaveBeenCalledWith('testApp', { count: 1, name: 'Alice' });
    });

    it('supports updater function that reads current state', () => {
      const config = createTestConfig();
      const storage = createMockStorage({ testApp: { count: 10, name: '' } });
      const context = createMockContext();
      const live = createLiveStore('testApp', config, storage, context);

      live.actions.increment();
      live.actions.increment();
      live.actions.increment();

      expect(live.getState().count).toBe(13);
    });
  });

  describe('getState$()', () => {
    it('emits state updates to subscribers', () => {
      const config = createTestConfig();
      const storage = createMockStorage();
      const context = createMockContext();
      const live = createLiveStore('testApp', config, storage, context);

      const emissions: TestState[] = [];
      live.getState$().subscribe((state) => emissions.push(state));

      live.actions.increment();
      live.actions.setName('Bob');

      expect(emissions).toEqual([
        { count: 0, name: '' },
        { count: 1, name: '' },
        { count: 1, name: 'Bob' },
      ]);
    });
  });

  describe('actions', () => {
    it('receives sidebar context for open/close operations', () => {
      const config = createTestConfig();
      const storage = createMockStorage();
      const context = createMockContext();
      const live = createLiveStore('testApp', config, storage, context);

      live.actions.incrementAndOpen();

      expect(live.getState().count).toBe(1);
      expect(context.open).toHaveBeenCalled();
    });
  });
});
