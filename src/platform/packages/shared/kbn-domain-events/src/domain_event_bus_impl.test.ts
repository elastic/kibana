/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { DomainEventBusImpl } from './domain_event_bus_impl';
import type { DomainEvent } from './types';

const request = httpServerMock.createKibanaRequest();

interface FooEvent extends DomainEvent<'cases.caseCreated'> {
  readonly type: 'cases.caseCreated';
  readonly payload: {
    caseId: string;
    owner: 'securitySolution';
  };
}

interface BarEvent extends DomainEvent<'workflows.workflowStarted'> {
  readonly type: 'workflows.workflowStarted';
  readonly payload: {
    spaceId: string;
    workflowId: string;
    workflowRunId: string;
  };
}

const fooEvent = (): FooEvent => ({
  type: 'cases.caseCreated',
  payload: {
    caseId: 'case-1',
    owner: 'securitySolution',
  },
  request,
});

const barEvent = (workflowRunId = 'run-1'): BarEvent => ({
  type: 'workflows.workflowStarted',
  payload: {
    spaceId: 'default',
    workflowId: 'workflow-1',
    workflowRunId,
  },
  request,
});

const flushAsync = async (): Promise<void> => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
};

describe('DomainEventBusImpl', () => {
  let bus: DomainEventBusImpl;

  beforeEach(() => {
    bus = new DomainEventBusImpl();
  });

  describe('publish / subscribe', () => {
    it('invokes the subscribed handler when a matching event is published', async () => {
      const handler = jest.fn();
      bus.subscribe('cases.caseCreated', handler);

      const event = fooEvent();
      bus.publish(event);

      await flushAsync();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('dispatches handlers asynchronously so publish() returns before handlers run', async () => {
      let handlerRan = false;
      bus.subscribe('cases.caseCreated', () => {
        handlerRan = true;
      });

      bus.publish(fooEvent());

      expect(handlerRan).toBe(false);

      await flushAsync();

      expect(handlerRan).toBe(true);
    });

    it('does not invoke handlers subscribed to a different event type', async () => {
      const fooHandler = jest.fn();
      const barHandler = jest.fn();
      bus.subscribe('cases.caseCreated', fooHandler);
      bus.subscribe('workflows.workflowStarted', barHandler);

      bus.publish(fooEvent());

      await flushAsync();

      expect(fooHandler).toHaveBeenCalledTimes(1);
      expect(barHandler).not.toHaveBeenCalled();
    });

    it('invokes every handler subscribed to the same event type', async () => {
      const handlers = [jest.fn(), jest.fn(), jest.fn()];
      handlers.forEach((handler) => bus.subscribe('cases.caseCreated', handler));

      const event = fooEvent();
      bus.publish(event);

      await flushAsync();

      handlers.forEach((handler) => {
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(event);
      });
    });

    it('awaits async handlers without surfacing errors to the publisher', async () => {
      const handler = jest.fn(async () => {
        await new Promise((resolve) => setImmediate(resolve));
      });
      bus.subscribe('cases.caseCreated', handler);

      bus.publish(fooEvent());

      await flushAsync();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('routes each event only to handlers of its own type even with multiple types in flight', async () => {
      const fooHandler = jest.fn();
      const barHandler = jest.fn();
      bus.subscribe('cases.caseCreated', fooHandler);
      bus.subscribe('workflows.workflowStarted', barHandler);

      const foo = fooEvent();
      const bar = barEvent('run-7');
      bus.publish(foo);
      bus.publish(bar);

      await flushAsync();

      expect(fooHandler).toHaveBeenCalledTimes(1);
      expect(fooHandler).toHaveBeenCalledWith(foo);
      expect(barHandler).toHaveBeenCalledTimes(1);
      expect(barHandler).toHaveBeenCalledWith(bar);
    });

  });

  describe('error isolation', () => {
    it('continues invoking siblings when a handler throws synchronously', async () => {
      const failing = jest.fn(() => {
        throw new Error('boom');
      });
      const succeeding = jest.fn();
      bus.subscribe('cases.caseCreated', failing);
      bus.subscribe('cases.caseCreated', succeeding);

      bus.publish(fooEvent());

      await flushAsync();

      expect(failing).toHaveBeenCalledTimes(1);
      expect(succeeding).toHaveBeenCalledTimes(1);
    });

    it('continues invoking siblings when a handler returns a rejected promise', async () => {
      const failing = jest.fn().mockRejectedValue(new Error('boom async'));
      const succeeding = jest.fn();
      bus.subscribe('cases.caseCreated', failing);
      bus.subscribe('cases.caseCreated', succeeding);

      bus.publish(fooEvent());

      await flushAsync();

      expect(failing).toHaveBeenCalledTimes(1);
      expect(succeeding).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('stops invoking the handler after unsubscribe()', async () => {
      const handler = jest.fn();
      const unsubscribe = bus.subscribe('cases.caseCreated', handler);

      bus.publish(fooEvent());
      await flushAsync();
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      bus.publish(fooEvent());
      await flushAsync();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not affect sibling handlers when one is unsubscribed', async () => {
      const handlerA = jest.fn();
      const handlerB = jest.fn();
      const unsubscribeA = bus.subscribe('cases.caseCreated', handlerA);
      bus.subscribe('cases.caseCreated', handlerB);

      unsubscribeA();
      bus.publish(fooEvent());

      await flushAsync();

      expect(handlerA).not.toHaveBeenCalled();
      expect(handlerB).toHaveBeenCalledTimes(1);
    });

    it('is idempotent: calling unsubscribe() more than once is a no-op', async () => {
      const handler = jest.fn();
      const unsubscribe = bus.subscribe('cases.caseCreated', handler);

      unsubscribe();
      unsubscribe();
      unsubscribe();

      bus.publish(fooEvent());
      await flushAsync();

      expect(handler).not.toHaveBeenCalled();
    });

    it('treats the same handler subscribed twice as two independent subscriptions', async () => {
      const handler = jest.fn();
      const unsubscribe1 = bus.subscribe('cases.caseCreated', handler);
      bus.subscribe('cases.caseCreated', handler);

      bus.publish(fooEvent());
      await flushAsync();
      expect(handler).toHaveBeenCalledTimes(2);

      unsubscribe1();
      bus.publish(fooEvent());
      await flushAsync();

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('publish validation', () => {
    it('ignores null events without dispatching to any handler', async () => {
      const handler = jest.fn();
      bus.subscribe('cases.caseCreated', handler);

      bus.publish(null as unknown as FooEvent);

      await flushAsync();

      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores undefined events', async () => {
      const handler = jest.fn();
      bus.subscribe('cases.caseCreated', handler);

      bus.publish(undefined as unknown as FooEvent);

      await flushAsync();

      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores events whose `type` is not a string', async () => {
      const handler = jest.fn();
      bus.subscribe('cases.caseCreated', handler);

      bus.publish({ type: 123 } as unknown as FooEvent);

      await flushAsync();

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
