/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line max-classes-per-file
import type { Observable } from 'rxjs';
import { BehaviorSubject, lastValueFrom, Subject } from 'rxjs';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AnalyticsClient } from './analytics_client';
import { take, toArray } from 'rxjs/operators';
import { shippersMock } from '../shippers/mocks';
import type { EventContext, TelemetryCounter } from '../events';
import { TelemetryCounterType } from '../events';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AnalyticsClient', () => {
  let analyticsClient: AnalyticsClient;
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
    analyticsClient = new AnalyticsClient({
      logger,
      isDev: true,
      sendTo: 'staging',
    });
  });

  describe('registerEventType', () => {
    test('successfully registers a event type', () => {
      analyticsClient.registerEventType({
        eventType: 'testEvent',
        schema: {
          a_field: {
            type: 'keyword',
            _meta: {
              description: 'description of a_field',
            },
          },
        },
      });
    });

    test('cannot register the same event type twice', () => {
      analyticsClient.registerEventType({
        eventType: 'testEvent',
        schema: {
          a_field: {
            type: 'keyword',
            _meta: {
              description: 'description of a_field',
            },
          },
        },
      });

      expect(() =>
        analyticsClient.registerEventType({
          eventType: 'testEvent',
          schema: {
            b_field: {
              type: 'date',
              _meta: {
                description: 'description of a_field',
              },
            },
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Event Type \\"testEvent\\" is already registered."`);
    });

    test('it can be used after deconstruction of the client', () => {
      const { registerEventType } = analyticsClient;
      registerEventType({
        eventType: 'testEvent',
        schema: {
          a_field: {
            type: 'keyword',
            _meta: {
              description: 'description of a_field',
            },
          },
        },
      });
    });
  });

  describe('reportEvent', () => {
    test('fails to report an event type because it is not registered yet', () => {
      expect(() =>
        analyticsClient.reportEvent('testEvent', { a_field: 'a' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Attempted to report event type \\"testEvent\\", before registering it. Use the \\"registerEventType\\" API to register it."`
      );
    });

    test('enqueues multiple events before specifying the optIn consent and registering a shipper', async () => {
      analyticsClient.registerEventType({
        eventType: 'testEvent',
        schema: {
          a_field: {
            type: 'keyword',
            _meta: {
              description: 'description of a_field',
            },
          },
        },
      });

      const internalQueuePromise = lastValueFrom(
        // eslint-disable-next-line dot-notation
        analyticsClient['internalEventQueue$'].pipe(take(3), toArray())
      );

      const telemetryCounterPromise = lastValueFrom(
        analyticsClient.telemetryCounter$.pipe(take(3), toArray())
      );

      analyticsClient.reportEvent('testEvent', { a_field: 'a' });
      analyticsClient.reportEvent('testEvent', { a_field: 'b' });
      analyticsClient.reportEvent('testEvent', { a_field: 'c' });

      // Expect 3 enqueued testEvent, but not shipped
      const eventCounters = await telemetryCounterPromise;
      expect(eventCounters).toHaveLength(3);
      eventCounters.forEach((eventCounter) => {
        expect(eventCounter).toEqual({
          type: 'enqueued',
          source: 'client',
          event_type: 'testEvent',
          code: 'enqueued',
          count: 1,
        });
      });

      // The events went to the internal queue because there are no optIn nor shippers specified yet
      const enqueuedEvents = await internalQueuePromise;
      expect(enqueuedEvents).toEqual([
        {
          context: {},
          event_type: 'testEvent',
          properties: { a_field: 'a' },
          timestamp: expect.any(String),
        },
        {
          context: {},
          event_type: 'testEvent',
          properties: { a_field: 'b' },
          timestamp: expect.any(String),
        },
        {
          context: {},
          event_type: 'testEvent',
          properties: { a_field: 'c' },
          timestamp: expect.any(String),
        },
      ]);
    });

    test('it can be used after deconstruction of the client', () => {
      const { registerEventType, reportEvent } = analyticsClient;
      registerEventType({
        eventType: 'testEvent',
        schema: {
          a_field: {
            type: 'keyword',
            _meta: {
              description: 'description of a_field',
            },
          },
        },
      });
      reportEvent('testEvent', { a_field: 'a' });
    });

    test('Handles errors coming from the shipper.reportEvents API', () => {
      const { optIn, registerEventType, registerShipper, reportEvent } = analyticsClient;
      const reportEventsMock = jest.fn().mockImplementation(() => {
        throw new Error('Something went terribly wrong');
      });
      class MockedShipper extends shippersMock.MockedShipper {
        reportEvents = reportEventsMock;
      }
      optIn({ global: { enabled: true } });
      registerShipper(MockedShipper, {});
      registerEventType({ eventType: 'testEvent', schema: {} });
      reportEvent('testEvent', {});
      expect(reportEventsMock).toHaveBeenCalledWith([
        {
          timestamp: expect.any(String),
          event_type: 'testEvent',
          properties: {},
          context: {},
        },
      ]);
      expect(logger.warn).toHaveBeenCalledWith(
        `Failed to report event "testEvent" via shipper "${MockedShipper.shipperName}"`,
        expect.any(Error)
      );
    });
  });

  describe('registerShipper', () => {
    test('Registers a global shipper', () => {
      // eslint-disable-next-line dot-notation
      expect(analyticsClient['shippersRegistry'].allShippers.size).toBe(0);
      analyticsClient.registerShipper(shippersMock.MockedShipper, {});

      // eslint-disable-next-line dot-notation
      expect(analyticsClient['shippersRegistry'].allShippers.size).toBe(1);

      expect(
        // eslint-disable-next-line dot-notation
        analyticsClient['shippersRegistry'].allShippers.get(shippersMock.MockedShipper.shipperName)
      ).toBeTruthy();
    });

    test('Fails to register the same global shipper twice', () => {
      analyticsClient.registerShipper(shippersMock.MockedShipper, {});
      expect(() =>
        analyticsClient.registerShipper(shippersMock.MockedShipper, {})
      ).toThrowErrorMatchingInlineSnapshot(`"Shipper \\"mocked-shipper\\" is already registered"`);
    });

    test('Registers an event exclusive shipper', () => {
      analyticsClient.registerShipper(
        shippersMock.MockedShipper,
        {},
        { exclusiveEventTypes: ['eventA', 'eventB'] }
      );

      // eslint-disable-next-line dot-notation
      expect(analyticsClient['shippersRegistry'].allShippers.size).toBe(1);

      // eslint-disable-next-line dot-notation
      expect(analyticsClient['shippersRegistry'].getShippersForEventType('eventA').size).toBe(1);
      // eslint-disable-next-line dot-notation
      expect(analyticsClient['shippersRegistry'].getShippersForEventType('eventB').size).toBe(1);
      // eslint-disable-next-line dot-notation
      expect(analyticsClient['shippersRegistry'].getShippersForEventType('eventC').size).toBe(0);
    });

    test('Forwards the telemetryCounter$ events from the shipper, overwriting the `source` property', async () => {
      class MockedShipper extends shippersMock.MockedShipper {
        constructor({ telemetryCounter$ }: { telemetryCounter$: Subject<TelemetryCounter> }) {
          super();
          this.telemetryCounter$ = telemetryCounter$;
        }
      }

      const mockTelemetryCounter$ = new Subject<TelemetryCounter>();

      // Typescript also helps with the config type inference <3
      analyticsClient.registerShipper(MockedShipper, { telemetryCounter$: mockTelemetryCounter$ });

      const counterEventPromise = lastValueFrom(analyticsClient.telemetryCounter$.pipe(take(1)));

      const counter: TelemetryCounter = {
        type: TelemetryCounterType.succeeded,
        source: 'a random value',
        event_type: 'eventTypeA',
        code: '200',
        count: 1000,
      };

      mockTelemetryCounter$.next(counter);

      await expect(counterEventPromise).resolves.toEqual({
        ...counter,
        source: MockedShipper.shipperName,
      });
    });

    class MockedShipper extends shippersMock.MockedShipper {
      constructor({
        optInMock,
        extendContextMock,
      }: {
        optInMock?: jest.Mock;
        extendContextMock?: jest.Mock;
      }) {
        super();
        if (optInMock) this.optIn = optInMock;
        if (extendContextMock) this.extendContext = extendContextMock;
      }
    }

    test('Registers a shipper and sets the opt-in status if the opt-in status was previously set', () => {
      // Call the optIn method before registering the shipper
      analyticsClient.optIn({ global: { enabled: true } });

      const optIn = jest.fn();
      analyticsClient.registerShipper(MockedShipper, { optInMock: optIn });
      expect(optIn).toHaveBeenCalledWith(true);
    });

    test('Registers a shipper and spreads the opt-in status changes', () => {
      const optIn = jest.fn();
      analyticsClient.registerShipper(MockedShipper, { optInMock: optIn });
      expect(optIn).not.toHaveBeenCalled();

      // Call the optIn method after registering the shipper
      analyticsClient.optIn({ global: { enabled: true } });
      expect(optIn).toHaveBeenCalledWith(true);
    });

    test('Spreads the context updates to the shipper (only after opt-in)', async () => {
      const extendContextMock = jest.fn();
      analyticsClient.registerShipper(MockedShipper, { extendContextMock });
      expect(extendContextMock).toHaveBeenCalledTimes(0); // Not until we have opt-in
      analyticsClient.optIn({ global: { enabled: true } });
      await delay(10);
      expect(extendContextMock).toHaveBeenCalledWith({}); // The initial context

      const context$ = new Subject<{ a_field: boolean }>();
      analyticsClient.registerContextProvider({
        name: 'contextProviderA',
        schema: {
          a_field: {
            type: 'boolean',
            _meta: {
              description: 'a_field description',
            },
          },
        },
        context$,
      });

      context$.next({ a_field: true });
      expect(extendContextMock).toHaveBeenCalledWith({ a_field: true }); // After update
    });

    test('Does not spread the context if opt-in === false', async () => {
      const extendContextMock = jest.fn();
      analyticsClient.registerShipper(MockedShipper, { extendContextMock });
      expect(extendContextMock).toHaveBeenCalledTimes(0); // Not until we have opt-in
      analyticsClient.optIn({ global: { enabled: false } });
      await delay(10);
      expect(extendContextMock).toHaveBeenCalledTimes(0); // Not until we have opt-in
    });

    test('Handles errors in the shipper', async () => {
      const extendContextMock = jest.fn().mockImplementation(() => {
        throw new Error('Something went terribly wrong');
      });
      analyticsClient.registerShipper(MockedShipper, { extendContextMock });
      analyticsClient.optIn({ global: { enabled: true } });
      await delay(10);
      expect(extendContextMock).toHaveBeenCalledWith({}); // The initial context
      expect(logger.warn).toHaveBeenCalledWith(
        `Shipper "${MockedShipper.shipperName}" failed to extend the context`,
        expect.any(Error)
      );
    });
  });

  describe('registerContextProvider', () => {
    let globalContext$: Observable<Partial<EventContext>>;

    beforeEach(() => {
      // eslint-disable-next-line dot-notation
      globalContext$ = analyticsClient['context$'];
    });

    test('Registers a context provider', async () => {
      const context$ = new Subject<{ a_field: boolean }>();
      analyticsClient.registerContextProvider({
        name: 'contextProviderA',
        schema: {
          a_field: {
            type: 'boolean',
            _meta: {
              description: 'a_field description',
            },
          },
        },
        context$,
      });

      const globalContextPromise = lastValueFrom(globalContext$.pipe(take(2), toArray()));
      context$.next({ a_field: true });
      await expect(globalContextPromise).resolves.toEqual([
        {}, // Original empty state
        { a_field: true },
      ]);
    });

    test('It does not break if context emits `undefined`', async () => {
      const context$ = new Subject<{ a_field: boolean } | undefined | void>();
      analyticsClient.registerContextProvider({
        name: 'contextProviderA',
        schema: {
          a_field: {
            type: 'boolean',
            _meta: {
              description: 'a_field description',
            },
          },
        },
        context$,
      });

      const globalContextPromise = lastValueFrom(globalContext$.pipe(take(3), toArray()));
      context$.next();
      context$.next(undefined);
      await expect(globalContextPromise).resolves.toEqual([
        {}, // Original empty state
        {},
        {},
      ]);
    });

    test('It does not break for BehaviourSubjects (emitting as soon as they connect)', async () => {
      const context$ = new BehaviorSubject<{ a_field: boolean }>({ a_field: true });
      analyticsClient.registerContextProvider({
        name: 'contextProviderA',
        schema: {
          a_field: {
            type: 'boolean',
            _meta: {
              description: 'a_field description',
            },
          },
        },
        context$,
      });

      const globalContextPromise = lastValueFrom(globalContext$.pipe(take(1), toArray()));
      await expect(globalContextPromise).resolves.toEqual([
        { a_field: true }, // No original empty state
      ]);
    });

    test('Merges all the contexts together', async () => {
      const contextA$ = new Subject<{ a_field: boolean }>();
      analyticsClient.registerContextProvider({
        name: 'contextProviderA',
        schema: {
          a_field: {
            type: 'boolean',
            _meta: {
              description: 'a_field description',
            },
          },
        },
        context$: contextA$,
      });

      const contextB$ = new Subject<{ a_field?: boolean; b_field: number }>();
      analyticsClient.registerContextProvider({
        name: 'contextProviderB',
        schema: {
          a_field: {
            type: 'boolean',
            _meta: {
              description: 'a_field description',
              optional: true,
            },
          },
          b_field: {
            type: 'long',
            _meta: {
              description: 'b_field description',
            },
          },
        },
        context$: contextB$,
      });

      const globalContextPromise = lastValueFrom(globalContext$.pipe(take(6), toArray()));
      contextA$.next({ a_field: true });
      contextB$.next({ b_field: 1 });
      contextB$.next({ a_field: false, b_field: 1 });
      contextA$.next({ a_field: true });
      contextB$.next({ b_field: 2 });
      await expect(globalContextPromise).resolves.toEqual([
        {}, // Original empty state
        { a_field: true },
        { a_field: true, b_field: 1 }, // Merged A & B
        { a_field: false, b_field: 1 }, // a_field updated from B
        { a_field: false, b_field: 1 }, // a_field still from B because it was registered later.
        // We may want to change this last behaviour in the future but, for now, it's fine.
        { a_field: true, b_field: 2 }, // a_field is now taken from A because B is not providing it yet.
      ]);
    });

    test('The global context is not polluted by context providers removing reported fields', async () => {
      const context$ = new Subject<{ a_field?: boolean; b_field: number }>();
      analyticsClient.registerContextProvider({
        name: 'contextProviderA',
        schema: {
          a_field: {
            type: 'boolean',
            _meta: {
              description: 'a_field description',
              optional: true,
            },
          },
          b_field: {
            type: 'long',
            _meta: {
              description: 'b_field description',
            },
          },
        },
        context$,
      });

      const globalContextPromise = lastValueFrom(globalContext$.pipe(take(6), toArray()));
      context$.next({ b_field: 1 });
      context$.next({ a_field: false, b_field: 1 });
      context$.next({ a_field: true, b_field: 1 });
      context$.next({ b_field: 1 });
      context$.next({ a_field: true, b_field: 2 });
      await expect(globalContextPromise).resolves.toEqual([
        {}, // Original empty state
        { b_field: 1 },
        { a_field: false, b_field: 1 },
        { a_field: true, b_field: 1 },
        { b_field: 1 }, // a_field is removed because the context provider removed it.
        { a_field: true, b_field: 2 },
      ]);
    });

    test('Fails to register 2 context providers with the same name', () => {
      analyticsClient.registerContextProvider({
        name: 'contextProviderA',
        schema: {
          a_field: {
            type: 'boolean',
            _meta: {
              description: 'a_field description',
            },
          },
        },
        context$: new Subject<{ a_field: boolean }>(),
      });
      expect(() => {
        analyticsClient.registerContextProvider({
          name: 'contextProviderA',
          schema: {
            a_field: {
              type: 'boolean',
              _meta: {
                description: 'a_field description',
              },
            },
          },
          context$: new Subject<{ a_field: boolean }>(),
        });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Context provider with name 'contextProviderA' already registered"`
      );
    });

    test('Does not remove the context provider after it completes', async () => {
      const context$ = new Subject<{ a_field: boolean }>();

      const contextProvidersRegistry =
        // eslint-disable-next-line dot-notation
        analyticsClient['contextService']['contextProvidersRegistry'];

      // The context registry is empty
      expect(contextProvidersRegistry.size).toBe(0);

      analyticsClient.registerContextProvider({
        name: 'contextProviderA',
        schema: {
          a_field: {
            type: 'boolean',
            _meta: {
              description: 'a_field description',
            },
          },
        },
        context$,
      });

      const globalContextPromise = lastValueFrom(globalContext$.pipe(take(4), toArray()));
      context$.next({ a_field: true });
      // The size of the registry grows on the first emission
      expect(contextProvidersRegistry.size).toBe(1);

      context$.next({ a_field: true });
      // Still in the registry
      expect(contextProvidersRegistry.size).toBe(1);
      context$.complete();
      // Still in the registry
      expect(contextProvidersRegistry.size).toBe(1);
      analyticsClient.removeContextProvider('contextProviderA');
      // The context provider is removed from the registry
      expect(contextProvidersRegistry.size).toBe(0);
      await expect(globalContextPromise).resolves.toEqual([
        {}, // Original empty state
        { a_field: true },
        { a_field: true },
        {},
      ]);
    });
  });

  describe('optIn', () => {
    let optInMock1: jest.Mock;
    let optInMock2: jest.Mock;

    beforeEach(() => {
      optInMock1 = jest.fn();

      class MockedShipper1 extends shippersMock.MockedShipper {
        static shipperName = 'mocked-shipper-1';
        optIn = optInMock1;
      }
      optInMock2 = jest.fn();
      class MockedShipper2 extends shippersMock.MockedShipper {
        static shipperName = 'mocked-shipper-2';
        optIn = optInMock2;
      }

      analyticsClient.registerShipper(MockedShipper1, {});
      analyticsClient.registerShipper(MockedShipper2, {});
    });

    test('Updates global optIn config', () => {
      // eslint-disable-next-line dot-notation
      expect(analyticsClient['optInConfig$'].value).toBeUndefined();

      analyticsClient.optIn({ global: { enabled: true } });
      // eslint-disable-next-line dot-notation
      expect(analyticsClient['optInConfig$'].value!['optInConfig']).toEqual({
        global: { enabled: true },
      });
    });

    test('Updates each shipper optIn config for global opt-in: true', () => {
      analyticsClient.optIn({ global: { enabled: true } });
      expect(optInMock1).toHaveBeenCalledWith(true);
      expect(optInMock2).toHaveBeenCalledWith(true);
    });

    test('Updates each shipper optIn config for global opt-in: false', () => {
      analyticsClient.optIn({ global: { enabled: false } });
      expect(optInMock1).toHaveBeenCalledWith(false);
      expect(optInMock2).toHaveBeenCalledWith(false);
    });

    test('Updates each shipper optIn config for global opt-in: true && shipper-specific: true', () => {
      analyticsClient.optIn({
        global: { enabled: true, shippers: { ['mocked-shipper-1']: true } },
      });
      expect(optInMock1).toHaveBeenCalledWith(true); // Using global and shipper-specific
      expect(optInMock2).toHaveBeenCalledWith(true); // Using only global
    });

    test('Updates each shipper optIn config for global opt-in: true && shipper-specific: false', () => {
      analyticsClient.optIn({
        global: { enabled: true, shippers: { ['mocked-shipper-1']: false } },
      });
      expect(optInMock1).toHaveBeenCalledWith(false); // Using global and shipper-specific
      expect(optInMock2).toHaveBeenCalledWith(true); // Using only global
    });

    test('Updates each shipper optIn config for global opt-in: false && shipper-specific: true', () => {
      analyticsClient.optIn({
        global: { enabled: false, shippers: { ['mocked-shipper-1']: true } },
      });
      expect(optInMock1).toHaveBeenCalledWith(false); // Using global and shipper-specific
      expect(optInMock2).toHaveBeenCalledWith(false); // Using only global
    });

    test('Updates each shipper optIn config for global opt-in: false && shipper-specific: false', () => {
      analyticsClient.optIn({
        global: { enabled: false, shippers: { ['mocked-shipper-1']: false } },
      });
      expect(optInMock1).toHaveBeenCalledWith(false); // Using global and shipper-specific
      expect(optInMock2).toHaveBeenCalledWith(false); // Using only global
    });
    test('Catches error in the shipper.optIn method', () => {
      optInMock1.mockImplementation(() => {
        throw new Error('Something went terribly wrong');
      });
      analyticsClient.optIn({ global: { enabled: true } });
      expect(optInMock1).toHaveBeenCalledWith(true); // Using global and shipper-specific
      expect(optInMock2).toHaveBeenCalledWith(true); // Using only global
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to set isOptedIn:true in shipper mocked-shipper-1',
        expect.any(Error)
      );
    });
  });

  describe('E2E', () => {
    class MockedShipper1 extends shippersMock.MockedShipper {
      static shipperName = 'mocked-shipper-1';
      constructor({ reportEventsMock }: { reportEventsMock: jest.Mock }) {
        super();
        this.reportEvents = reportEventsMock;
      }
    }

    class MockedShipper2 extends MockedShipper1 {
      static shipperName = 'mocked-shipper-2';
    }

    beforeEach(() => {
      analyticsClient.registerEventType({
        eventType: 'event-type-a',
        schema: {
          a_field: {
            type: 'keyword',
            _meta: {
              description: 'description of a_field',
            },
          },
        },
      });
      analyticsClient.registerEventType({
        eventType: 'event-type-b',
        schema: {
          b_field: {
            type: 'long',
            _meta: {
              description: 'description of b_field',
            },
          },
        },
      });
    });

    test('Enqueues early events', async () => {
      // eslint-disable-next-line dot-notation
      const internalEventQueue$ = analyticsClient['internalEventQueue$'];

      const internalQueuePromise = lastValueFrom(internalEventQueue$.pipe(take(2), toArray()));

      const telemetryCounterPromise = lastValueFrom(
        analyticsClient.telemetryCounter$.pipe(take(2), toArray())
      );

      analyticsClient.reportEvent('event-type-a', { a_field: 'a' });
      analyticsClient.reportEvent('event-type-b', { b_field: 100 });

      // Expect 2 enqueued testEvent, but not shipped
      await expect(telemetryCounterPromise).resolves.toEqual([
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-b',
          code: 'enqueued',
          count: 1,
        },
      ]);

      // The events went to the internal queue because there are no optIn nor shippers specified yet
      await expect(internalQueuePromise).resolves.toEqual([
        {
          context: {},
          event_type: 'event-type-a',
          properties: { a_field: 'a' },
          timestamp: expect.any(String),
        },
        {
          context: {},
          event_type: 'event-type-b',
          properties: { b_field: 100 },
          timestamp: expect.any(String),
        },
      ]);
    });

    test('Sends events from the internal queue when there are shippers and an opt-in response is true', async () => {
      const telemetryCounterPromise = lastValueFrom(
        analyticsClient.telemetryCounter$.pipe(take(3 + 2), toArray()) // Waiting for 3 enqueued + 2 batch-shipped events
      );

      // Send multiple events of 1 type to test the grouping logic as well
      analyticsClient.reportEvent('event-type-a', { a_field: 'a' });
      analyticsClient.reportEvent('event-type-b', { b_field: 100 });
      analyticsClient.reportEvent('event-type-a', { a_field: 'b' });

      // As proven in the previous test, the events are still enqueued.
      // Let's register a shipper and opt-in to test the dequeue logic.
      const reportEventsMock = jest.fn();
      analyticsClient.registerShipper(MockedShipper1, { reportEventsMock });
      analyticsClient.optIn({ global: { enabled: true } });
      await delay(10);

      expect(reportEventsMock).toHaveBeenCalledTimes(2);
      expect(reportEventsMock).toHaveBeenNthCalledWith(1, [
        {
          context: {},
          event_type: 'event-type-a',
          properties: { a_field: 'a' },
          timestamp: expect.any(String),
        },
        {
          context: {},
          event_type: 'event-type-a',
          properties: { a_field: 'b' },
          timestamp: expect.any(String),
        },
      ]);
      expect(reportEventsMock).toHaveBeenNthCalledWith(2, [
        {
          context: {},
          event_type: 'event-type-b',
          properties: { b_field: 100 },
          timestamp: expect.any(String),
        },
      ]);

      // Expect 3 enqueued events, and 2 sent_to_shipper batched requests
      await expect(telemetryCounterPromise).resolves.toEqual([
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-b',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'sent_to_shipper',
          source: 'client',
          event_type: 'event-type-a',
          code: 'OK',
          count: 2,
        },
        {
          type: 'sent_to_shipper',
          source: 'client',
          event_type: 'event-type-b',
          code: 'OK',
          count: 1,
        },
      ]);
    });

    test('Discards events from the internal queue when there are shippers and an opt-in response is false', async () => {
      const telemetryCounterPromise = lastValueFrom(
        analyticsClient.telemetryCounter$.pipe(take(3), toArray()) // Waiting for 3 enqueued
      );

      // Send multiple events of 1 type to test the grouping logic as well
      analyticsClient.reportEvent('event-type-a', { a_field: 'a' });
      analyticsClient.reportEvent('event-type-b', { b_field: 100 });
      analyticsClient.reportEvent('event-type-a', { a_field: 'b' });

      const reportEventsMock = jest.fn();
      analyticsClient.registerShipper(MockedShipper1, { reportEventsMock });
      analyticsClient.optIn({ global: { enabled: false } });

      expect(reportEventsMock).toHaveBeenCalledTimes(0);

      // Expect 2 enqueued, but not shipped
      await expect(telemetryCounterPromise).resolves.toEqual([
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-b',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
      ]);
    });

    test('Discards only one type of the enqueued events based on event_type config', async () => {
      const telemetryCounterPromise = lastValueFrom(
        analyticsClient.telemetryCounter$.pipe(take(3 + 1), toArray()) // Waiting for 3 enqueued + 1 batch-shipped events
      );

      // Send multiple events of 1 type to test the grouping logic as well
      analyticsClient.reportEvent('event-type-a', { a_field: 'a' });
      analyticsClient.reportEvent('event-type-b', { b_field: 100 });
      analyticsClient.reportEvent('event-type-a', { a_field: 'b' });

      const reportEventsMock = jest.fn();
      analyticsClient.registerShipper(MockedShipper1, { reportEventsMock });
      analyticsClient.optIn({
        global: { enabled: true },
        event_types: { ['event-type-a']: { enabled: false } },
      });
      await delay(10);

      expect(reportEventsMock).toHaveBeenCalledTimes(1);
      expect(reportEventsMock).toHaveBeenNthCalledWith(1, [
        {
          context: {},
          event_type: 'event-type-b',
          properties: { b_field: 100 },
          timestamp: expect.any(String),
        },
      ]);

      // Expect 3 enqueued events, and 1 sent_to_shipper batched request
      await expect(telemetryCounterPromise).resolves.toEqual([
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-b',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'sent_to_shipper',
          source: 'client',
          event_type: 'event-type-b',
          code: 'OK',
          count: 1,
        },
      ]);
    });

    test('Discards the event at the shipper level (for a specific event)', async () => {
      const telemetryCounterPromise = lastValueFrom(
        analyticsClient.telemetryCounter$.pipe(take(3 + 2), toArray()) // Waiting for 3 enqueued + 2 batch-shipped events
      );

      // Send multiple events of 1 type to test the grouping logic as well
      analyticsClient.reportEvent('event-type-a', { a_field: 'a' });
      analyticsClient.reportEvent('event-type-b', { b_field: 100 });
      analyticsClient.reportEvent('event-type-a', { a_field: 'b' });

      // Register 2 shippers and set 1 of them as disabled for event-type-a
      const reportEventsMock1 = jest.fn();
      const reportEventsMock2 = jest.fn();
      analyticsClient.registerShipper(MockedShipper1, { reportEventsMock: reportEventsMock1 });
      analyticsClient.registerShipper(MockedShipper2, { reportEventsMock: reportEventsMock2 });
      analyticsClient.optIn({
        global: { enabled: true },
        event_types: {
          ['event-type-a']: { enabled: true, shippers: { [MockedShipper2.shipperName]: false } },
        },
      });
      await delay(10);

      expect(reportEventsMock1).toHaveBeenCalledTimes(2);
      expect(reportEventsMock1).toHaveBeenNthCalledWith(1, [
        {
          context: {},
          event_type: 'event-type-a',
          properties: { a_field: 'a' },
          timestamp: expect.any(String),
        },
        {
          context: {},
          event_type: 'event-type-a',
          properties: { a_field: 'b' },
          timestamp: expect.any(String),
        },
      ]);
      expect(reportEventsMock1).toHaveBeenNthCalledWith(2, [
        {
          context: {},
          event_type: 'event-type-b',
          properties: { b_field: 100 },
          timestamp: expect.any(String),
        },
      ]);
      expect(reportEventsMock2).toHaveBeenCalledTimes(1);
      expect(reportEventsMock2).toHaveBeenNthCalledWith(1, [
        {
          context: {},
          event_type: 'event-type-b',
          properties: { b_field: 100 },
          timestamp: expect.any(String),
        },
      ]);

      // Expect 3 enqueued events, and 2 sent_to_shipper batched requests
      await expect(telemetryCounterPromise).resolves.toEqual([
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-b',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'sent_to_shipper',
          source: 'client',
          event_type: 'event-type-a',
          code: 'OK',
          count: 2,
        },
        {
          type: 'sent_to_shipper',
          source: 'client',
          event_type: 'event-type-b',
          code: 'OK',
          count: 1,
        },
      ]);
    });

    test('Discards all the events at the shipper level (globally disabled)', async () => {
      const telemetryCounterPromise = lastValueFrom(
        analyticsClient.telemetryCounter$.pipe(take(3 + 2), toArray()) // Waiting for 3 enqueued + 2 batch-shipped events
      );

      // Send multiple events of 1 type to test the grouping logic as well
      analyticsClient.reportEvent('event-type-a', { a_field: 'a' });
      analyticsClient.reportEvent('event-type-b', { b_field: 100 });
      analyticsClient.reportEvent('event-type-a', { a_field: 'b' });

      // Register 2 shippers and set 1 of them as globally disabled
      const reportEventsMock1 = jest.fn();
      const reportEventsMock2 = jest.fn();
      analyticsClient.registerShipper(MockedShipper1, { reportEventsMock: reportEventsMock1 });
      analyticsClient.registerShipper(MockedShipper2, { reportEventsMock: reportEventsMock2 });
      analyticsClient.optIn({
        global: { enabled: true, shippers: { [MockedShipper2.shipperName]: false } },
        event_types: {
          ['event-type-a']: { enabled: true },
        },
      });
      await delay(10);

      expect(reportEventsMock1).toHaveBeenCalledTimes(2);
      expect(reportEventsMock1).toHaveBeenNthCalledWith(1, [
        {
          context: {},
          event_type: 'event-type-a',
          properties: { a_field: 'a' },
          timestamp: expect.any(String),
        },
        {
          context: {},
          event_type: 'event-type-a',
          properties: { a_field: 'b' },
          timestamp: expect.any(String),
        },
      ]);
      expect(reportEventsMock1).toHaveBeenNthCalledWith(2, [
        {
          context: {},
          event_type: 'event-type-b',
          properties: { b_field: 100 },
          timestamp: expect.any(String),
        },
      ]);
      expect(reportEventsMock2).toHaveBeenCalledTimes(0);

      // Expect 3 enqueued events, and 2 sent_to_shipper batched requests
      await expect(telemetryCounterPromise).resolves.toEqual([
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-b',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'sent_to_shipper',
          source: 'client',
          event_type: 'event-type-a',
          code: 'OK',
          count: 2,
        },
        {
          type: 'sent_to_shipper',
          source: 'client',
          event_type: 'event-type-b',
          code: 'OK',
          count: 1,
        },
      ]);
    });

    test('Discards incoming events when opt-in response is false', async () => {
      // Set OptIn and shipper first to test the "once-set up" scenario
      const reportEventsMock = jest.fn();
      analyticsClient.registerShipper(MockedShipper1, { reportEventsMock });
      analyticsClient.optIn({ global: { enabled: false } });

      const telemetryCounterPromise = lastValueFrom(
        analyticsClient.telemetryCounter$.pipe(take(3), toArray()) // Waiting for 3 enqueued
      );

      // Send multiple events of 1 type to test the non-grouping logic at this stage as well
      analyticsClient.reportEvent('event-type-a', { a_field: 'a' });
      analyticsClient.reportEvent('event-type-b', { b_field: 100 });
      analyticsClient.reportEvent('event-type-a', { a_field: 'b' });

      expect(reportEventsMock).toHaveBeenCalledTimes(0);

      // Expect 2 enqueued, but not shipped
      await expect(telemetryCounterPromise).resolves.toEqual([
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-b',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
      ]);
    });

    test('Forwards incoming events to the shippers when opt-in response is true', async () => {
      // Set OptIn and shipper first to test the "once-set up" scenario
      const reportEventsMock = jest.fn();
      analyticsClient.registerShipper(MockedShipper1, { reportEventsMock });
      analyticsClient.optIn({ global: { enabled: true } });

      const telemetryCounterPromise = lastValueFrom(
        analyticsClient.telemetryCounter$.pipe(take(3 * 2), toArray()) // Waiting for 2 events per each reportEvent call: enqueued and sent_to_shipper
      );

      // Send multiple events of 1 type to test the non-grouping logic at this stage as well
      analyticsClient.reportEvent('event-type-a', { a_field: 'a' });
      analyticsClient.reportEvent('event-type-b', { b_field: 100 });
      analyticsClient.reportEvent('event-type-a', { a_field: 'b' });

      // This time the reportEvent API is called once per event (no grouping/batching applied at this stage)
      expect(reportEventsMock).toHaveBeenCalledTimes(3);
      expect(reportEventsMock).toHaveBeenNthCalledWith(1, [
        {
          context: {},
          event_type: 'event-type-a',
          properties: { a_field: 'a' },
          timestamp: expect.any(String),
        },
      ]);
      expect(reportEventsMock).toHaveBeenNthCalledWith(2, [
        {
          context: {},
          event_type: 'event-type-b',
          properties: { b_field: 100 },
          timestamp: expect.any(String),
        },
      ]);
      expect(reportEventsMock).toHaveBeenNthCalledWith(3, [
        {
          context: {},
          event_type: 'event-type-a',
          properties: { a_field: 'b' },
          timestamp: expect.any(String),
        },
      ]);

      // Expect 2 enqueued, but not shipped
      await expect(telemetryCounterPromise).resolves.toEqual([
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'sent_to_shipper',
          source: 'client',
          event_type: 'event-type-a',
          code: 'OK',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-b',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'sent_to_shipper',
          source: 'client',
          event_type: 'event-type-b',
          code: 'OK',
          count: 1,
        },
        {
          type: 'enqueued',
          source: 'client',
          event_type: 'event-type-a',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'sent_to_shipper',
          source: 'client',
          event_type: 'event-type-a',
          code: 'OK',
          count: 1,
        },
      ]);
    });
  });
});
