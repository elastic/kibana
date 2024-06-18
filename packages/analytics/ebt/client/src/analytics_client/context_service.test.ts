/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { BehaviorSubject, firstValueFrom, lastValueFrom, Subject, take, toArray } from 'rxjs';
import type { EventContext } from '../events';
import { ContextService } from './context_service';

describe('ContextService', () => {
  let globalContext$: Subject<Partial<EventContext>>;
  let contextService: ContextService;
  let logger: MockedLogger;

  beforeEach(() => {
    globalContext$ = new BehaviorSubject<Partial<EventContext>>({});
    logger = loggerMock.create();
    contextService = new ContextService(globalContext$, true, logger);
  });

  test('Registers a context provider', async () => {
    const context$ = new Subject<{ a_field: boolean }>();
    contextService.registerContextProvider({
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
    contextService = new ContextService(
      globalContext$,
      false, // setting to `false` so the validation piece of logic does not kick in.
      logger
    );

    const context$ = new Subject<{ a_field: boolean } | undefined | void>();
    contextService.registerContextProvider({
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
    contextService.registerContextProvider({
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
    contextService.registerContextProvider({
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
    contextService.registerContextProvider({
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
    contextService.registerContextProvider({
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

  test('The undefined values are not forwarded to the global context', async () => {
    const context$ = new Subject<{ a_field?: boolean; b_field: number }>();
    contextService.registerContextProvider({
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

    const globalContextPromise = firstValueFrom(globalContext$.pipe(take(6), toArray()));
    context$.next({ b_field: 1 });
    context$.next({ a_field: false, b_field: 1 });
    context$.next({ a_field: true, b_field: 1 });
    context$.next({ b_field: 1 });
    context$.next({ a_field: undefined, b_field: 2 });
    await expect(globalContextPromise).resolves.toEqual([
      {}, // Original empty state
      { b_field: 1 },
      { a_field: false, b_field: 1 },
      { a_field: true, b_field: 1 },
      { b_field: 1 }, // a_field is removed because the context provider removed it.
      { b_field: 2 }, // a_field is not forwarded because it is `undefined`
    ]);
  });

  test('Fails to register 2 context providers with the same name', () => {
    contextService.registerContextProvider({
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
      contextService.registerContextProvider({
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

    // eslint-disable-next-line dot-notation
    const contextProvidersRegistry = contextService['contextProvidersRegistry'];

    // The context registry is empty
    expect(contextProvidersRegistry.size).toBe(0);

    contextService.registerContextProvider({
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
    contextService.removeContextProvider('contextProviderA');
    // The context provider is removed from the registry
    expect(contextProvidersRegistry.size).toBe(0);
    await expect(globalContextPromise).resolves.toEqual([
      {}, // Original empty state
      { a_field: true },
      { a_field: true },
      {},
    ]);
  });

  test('validates the input and logs the error if invalid', () => {
    const context$ = new Subject<{ a_field: boolean } | undefined>();
    contextService.registerContextProvider({
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

    context$.next(undefined);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect((logger.error.mock.calls[0][0] as Error).message).toContain(
      `Failed to validate payload coming from "Context Provider 'contextProviderA'"`
    );
  });

  test('it does not stop the subscription after an error', async () => {
    const context$ = new Subject<{ a_field: boolean } | undefined>();
    contextService.registerContextProvider({
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
    context$.next({ a_field: '123' as unknown as boolean }); // cause the error
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect((logger.error.mock.calls[0][0] as Error).message).toContain(
      `Failed to validate payload coming from "Context Provider 'contextProviderA'"`
    );
    context$.next({ a_field: true }); // send a good one
    await expect(globalContextPromise).resolves.toEqual([
      {}, // Original empty state
      { a_field: true }, // 2nd emission (the errored one does not spread)
    ]);
  });
});
