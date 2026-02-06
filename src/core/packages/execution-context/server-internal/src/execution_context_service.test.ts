/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as timer } from 'timers/promises';
import { BehaviorSubject } from 'rxjs';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { InternalExecutionContextSetup } from './execution_context_service';
import { ExecutionContextService } from './execution_context_service';

describe('ExecutionContextService', () => {
  describe('setup', () => {
    let service: InternalExecutionContextSetup;
    let core: ReturnType<typeof mockCoreContext.create>;

    beforeEach(() => {
      core = mockCoreContext.create();
      core.configService.atPath.mockReturnValue(new BehaviorSubject({ enabled: true }));
      service = new ExecutionContextService(core).setup();
    });

    describe('set', () => {
      it('sets and gets a value in async context', async () => {
        const chainA = Promise.resolve().then(async () => {
          service.set({
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
            space: 'awesome-space',
          });
          await timer(500);
          return service.get();
        });

        const chainB = Promise.resolve().then(async () => {
          service.set({
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
          });
          await timer(100);
          return service.get();
        });

        expect(
          await Promise.all([chainA, chainB]).then((results) =>
            results.map((result) => result?.toJSON())
          )
        ).toEqual([
          {
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
            child: undefined,
            space: 'awesome-space',
          },

          {
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
            child: undefined,
          },
        ]);
      });

      it('a sequentual call rewrites the context', async () => {
        const result = await Promise.resolve().then(async () => {
          service.set({
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
          });
          service.set({
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
          });

          return service.get();
        });

        expect(result?.toJSON()).toEqual({
          type: 'type-b',
          name: 'name-b',
          id: 'id-b',
          description: 'description-b',
          parent: undefined,
        });
      });

      it('emits context to the logs when "set" is called', async () => {
        service.set({
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          description: 'description-a',
        });
        expect(loggingSystemMock.collect(core.logger).debug).toMatchInlineSnapshot(`
          Array [
            Array [
              "{\\"type\\":\\"type-a\\",\\"name\\":\\"name-a\\",\\"id\\":\\"id-a\\",\\"description\\":\\"description-a\\"}",
            ],
          ]
        `);
      });

      it('can be disabled', async () => {
        const coreWithDisabledService = mockCoreContext.create();
        coreWithDisabledService.configService.atPath.mockReturnValue(
          new BehaviorSubject({ enabled: false })
        );
        const disabledService = new ExecutionContextService(coreWithDisabledService).setup();
        const chainA = await Promise.resolve().then(async () => {
          disabledService.set({
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
          });
          await timer(100);
          return disabledService.get();
        });

        expect(chainA).toBeUndefined();
      });
    });

    describe('withContext', () => {
      it('sets and gets a value in async context', async () => {
        const chainA = service.withContext(
          {
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
          },
          async () => {
            await timer(10);
            return service.get();
          }
        );

        const chainB = service.withContext(
          {
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
          },
          async () => {
            await timer(50);
            return service.get();
          }
        );

        expect(
          await Promise.all([chainA, chainB]).then((results) =>
            results.map((result) => result?.toJSON())
          )
        ).toEqual([
          {
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
            parent: undefined,
          },
          {
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
            parent: undefined,
          },
        ]);
      });

      it('sets the context for a wrapped function only', () => {
        service.withContext(
          {
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
          },
          async () => {
            await timer(10);
            return service.get();
          }
        );

        expect(service.get()).toBe(undefined);
      });

      it('a sequentual call does not affect orhers contexts', async () => {
        const chainA = service.withContext(
          {
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
          },
          async () => {
            await timer(50);
            return service.get();
          }
        );

        const chainB = service.withContext(
          {
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
          },
          async () => {
            await timer(10);
            return service.get();
          }
        );
        const result = await Promise.all([chainA, chainB]);
        expect(result.map((r) => r?.toJSON())).toEqual([
          {
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
            parent: undefined,
          },
          {
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
            parent: undefined,
          },
        ]);
      });

      it('supports nested contexts', async () => {
        const result = await service.withContext(
          {
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
          },
          async () => {
            await timer(10);
            return service.withContext(
              {
                type: 'type-b',
                name: 'name-b',
                id: 'id-b',
                description: 'description-b',
              },
              () => service.get()
            );
          }
        );

        expect(result?.toJSON()).toEqual({
          child: {
            child: undefined,
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
          },
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          description: 'description-a',
        });
      });

      it('inherits a nested context configured by "set"', async () => {
        service.set({
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          description: 'description-a',
        });
        const result = await service.withContext(
          {
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
          },
          async () => {
            await timer(10);
            return service.get();
          }
        );

        expect(result?.toJSON()).toEqual({
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          description: 'description-a',
          child: {
            child: undefined,
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
          },
        });
      });

      it('do not swallow errors', () => {
        const error = new Error('oops');
        const promise = service.withContext(
          {
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
          },
          async () => {
            await timer(10);
            throw error;
          }
        );

        expect(promise).rejects.toBe(error);
      });

      it('emits context to the logs when "withContext" is called', async () => {
        service.withContext(
          {
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
          },
          () => null
        );
        expect(loggingSystemMock.collect(core.logger).debug).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      "{\\"type\\":\\"type-a\\",\\"name\\":\\"name-a\\",\\"id\\":\\"id-a\\",\\"description\\":\\"description-a\\"}",
                    ],
                  ]
              `);
      });

      it('can be disabled', async () => {
        const coreWithDisabledService = mockCoreContext.create();
        coreWithDisabledService.configService.atPath.mockReturnValue(
          new BehaviorSubject({ enabled: false })
        );
        const disabledService = new ExecutionContextService(coreWithDisabledService).setup();
        const result = await disabledService.withContext(
          {
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
          },
          async () => {
            await timer(10);
            return service.get();
          }
        );

        expect(result).toBeUndefined();
      });
      it('executes provided function when disabled', async () => {
        const coreWithDisabledService = mockCoreContext.create();
        coreWithDisabledService.configService.atPath.mockReturnValue(
          new BehaviorSubject({ enabled: false })
        );
        const disabledService = new ExecutionContextService(coreWithDisabledService).setup();
        const fn = jest.fn();

        disabledService.withContext(
          {
            type: 'type-b',
            name: 'name-b',
            id: 'id-b',
            description: 'description-b',
          },
          fn
        );

        expect(fn).toHaveBeenCalledTimes(1);
      });
    });

    describe('getAsHeader', () => {
      it('returns request id if no context provided', async () => {
        service.setRequestId('1234');

        expect(service.getAsHeader()).toBe('1234');
      });

      it('falls back to "unknownId" if no id provided', async () => {
        expect(service.getAsHeader()).toBe('unknownId');
      });

      it('falls back to "unknownId" and context if no id provided', async () => {
        service.set({
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          description: 'description-a',
        });

        expect(service.getAsHeader()).toBe('unknownId;kibana:type-a:name-a:id-a');
      });

      it('returns request id and registered context', async () => {
        service.setRequestId('1234');
        service.set({
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          description: 'description-a',
        });

        expect(service.getAsHeader()).toBe('1234;kibana:type-a:name-a:id-a');
      });

      it('can be disabled', async () => {
        const coreWithDisabledService = mockCoreContext.create();
        coreWithDisabledService.configService.atPath.mockReturnValue(
          new BehaviorSubject({ enabled: false })
        );
        const disabledService = new ExecutionContextService(coreWithDisabledService).setup();
        disabledService.setRequestId('1234');
        disabledService.set({
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          description: 'description-a',
        });

        expect(disabledService.getAsHeader()).toBeUndefined();
      });
    });
  });

  describe('config', () => {
    it('reacts to config changes', async () => {
      const core = mockCoreContext.create();
      const config$ = new BehaviorSubject({ enabled: false });
      core.configService.atPath.mockReturnValue(config$);
      const service = new ExecutionContextService(core).setup();
      function exec() {
        return Promise.resolve().then(async () => {
          service.set({
            type: 'type-a',
            name: 'name-a',
            id: 'id-a',
            description: 'description-a',
          });
          await timer(100);
          return service.get();
        });
      }
      expect(await exec()).toBeUndefined();

      config$.next({
        enabled: true,
      });
      expect(await exec()).toBeDefined();

      config$.next({
        enabled: false,
      });

      expect(await exec()).toBeUndefined();
    });
  });
});
