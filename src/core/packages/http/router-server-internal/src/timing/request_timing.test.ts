/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RequestTimingImpl } from './request_timing';
import type { RequestTimingState } from './types';

describe('RequestTimingImpl', () => {
  let state: RequestTimingState;
  let timing: RequestTimingImpl;

  beforeEach(() => {
    state = { events: [] };
    timing = new RequestTimingImpl(state);
  });

  describe('start()', () => {
    it('returns a timer with an end() method', () => {
      const timer = timing.start('test-operation');

      expect(timer).toBeDefined();
      expect(typeof timer.end).toBe('function');
    });

    it('creates an event when timer.end() is called', () => {
      const timer = timing.start('test-operation');
      timer.end();

      expect(state.events).toHaveLength(1);
      expect(state.events[0].name).toBe('test-operation');
      expect(state.events[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('includes description in the event', () => {
      const timer = timing.start('test-operation', 'Test description');
      timer.end();

      expect(state.events[0].description).toBe('Test description');
    });

    it('does not create an event if timer.end() is not called', () => {
      timing.start('test-operation');

      expect(state.events).toHaveLength(0);
    });

    it('handles multiple timer.end() calls idempotently', () => {
      const timer = timing.start('test-operation');
      timer.end();
      timer.end();
      timer.end();

      expect(state.events).toHaveLength(1);
    });

    it('handles overlapping timers correctly', () => {
      const timer1 = timing.start('operation-1');
      const timer2 = timing.start('operation-2');

      timer2.end();
      timer1.end();

      expect(state.events).toHaveLength(2);
      expect(state.events[0].name).toBe('operation-2');
      expect(state.events[1].name).toBe('operation-1');
    });

    it('allows multiple simultaneous operations', async () => {
      const timer1 = timing.start('operation-1');
      const timer2 = timing.start('operation-2');

      await Promise.all([
        new Promise((resolve) =>
          setTimeout(() => {
            timer1.end();
            resolve(undefined);
          }, 10)
        ),
        new Promise((resolve) =>
          setTimeout(() => {
            timer2.end();
            resolve(undefined);
          }, 5)
        ),
      ]);

      expect(state.events).toHaveLength(2);
      expect(state.events.find((e) => e.name === 'operation-1')).toBeDefined();
      expect(state.events.find((e) => e.name === 'operation-2')).toBeDefined();
    });
  });

  describe('measure()', () => {
    it('records a timing event with explicit duration', () => {
      timing.measure('test-operation', 123.45);

      expect(state.events).toHaveLength(1);
      expect(state.events[0].name).toBe('test-operation');
      expect(state.events[0].duration).toBe(123.45);
    });

    it('includes description when provided', () => {
      timing.measure('test-operation', 123.45, 'Test description');

      expect(state.events[0].description).toBe('Test description');
    });

    it('skips events with negative duration', () => {
      timing.measure('test-operation', -10);

      expect(state.events).toHaveLength(0);
    });

    it('skips events with names longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      timing.measure(longName, 123.45);

      expect(state.events).toHaveLength(0);
    });

    it('allows events with names exactly 100 characters', () => {
      const exactName = 'a'.repeat(100);
      timing.measure(exactName, 123.45);

      expect(state.events).toHaveLength(1);
      expect(state.events[0].name).toBe(exactName);
    });

    it('allows zero duration', () => {
      timing.measure('test-operation', 0);

      expect(state.events).toHaveLength(1);
      expect(state.events[0].duration).toBe(0);
    });
  });

  describe('getEvents()', () => {
    it('returns empty array when no events recorded', () => {
      const events = timing.getEvents();

      expect(events).toEqual([]);
    });

    it('returns all recorded events', () => {
      const timer1 = timing.start('operation-1');
      timer1.end();
      timing.measure('operation-2', 50);

      const events = timing.getEvents();

      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('operation-1');
      expect(events[1].name).toBe('operation-2');
      expect(events[1].duration).toBe(50);
    });

    it('returns readonly array', () => {
      timing.measure('operation-1', 100);
      const events = timing.getEvents();

      expect(Object.isFrozen(events)).toBe(false); // Array itself is not frozen
      // But the type ensures it's readonly at compile time
      expect(events).toEqual(state.events);
    });
  });
});
