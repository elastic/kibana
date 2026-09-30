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

    describe('getAsLabels', () => {
      it('returns empty object when no context is set', () => {
        expect(service.getAsLabels()).toEqual({});
      });

      it('returns name, id, and page from the context', () => {
        service.set({
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          page: 'page-a',
          description: 'description-a',
        });

        expect(service.getAsLabels()).toEqual({
          name: 'name-a',
          id: 'id-a',
          page: 'page-a',
        });
      });

      it('omits undefined fields', () => {
        service.set({
          type: 'type-a',
          name: undefined,
          id: 'id-a',
          description: 'description-a',
        });

        expect(service.getAsLabels()).toEqual({
          id: 'id-a',
        });
      });

      it('flattens meta fields with kibana.meta. prefix', () => {
        service.set({
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          page: 'page-a',
          meta: {
            profile_id: 'metrics-data-source-profile',
            metric_name: 'system.cpu.total.norm.pct',
          },
        });

        expect(service.getAsLabels()).toEqual({
          name: 'name-a',
          id: 'id-a',
          page: 'page-a',
          kibana_meta_profile_id: 'metrics-data-source-profile',
          kibana_meta_metric_name: 'system.cpu.total.norm.pct',
        });
      });

      it('handles meta with numeric and boolean values', () => {
        service.set({
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          meta: {
            count: 42,
            enabled: true,
          },
        });

        expect(service.getAsLabels()).toEqual({
          name: 'name-a',
          id: 'id-a',
          kibana_meta_count: 42,
          kibana_meta_enabled: true,
        });
      });

      it('omits undefined values in meta', () => {
        service.set({
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          meta: {
            present: 'value',
            missing: undefined,
          },
        });

        expect(service.getAsLabels()).toEqual({
          name: 'name-a',
          id: 'id-a',
          kibana_meta_present: 'value',
        });
      });

      it('can be disabled', () => {
        const coreWithDisabledService = mockCoreContext.create();
        coreWithDisabledService.configService.atPath.mockReturnValue(
          new BehaviorSubject({ enabled: false })
        );
        const disabledService = new ExecutionContextService(coreWithDisabledService).setup();
        disabledService.set({
          type: 'type-a',
          name: 'name-a',
          id: 'id-a',
          page: 'page-a',
          meta: { profile_id: 'test' },
        });

        expect(disabledService.getAsLabels()).toEqual({});
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

  describe('activity observer', () => {
    const context = { type: 'task manager', name: 'run x', id: '1' };

    const setup = (enabled: boolean) => {
      const core = mockCoreContext.create();
      core.configService.atPath.mockReturnValue(new BehaviorSubject({ enabled }));
      const service = new ExecutionContextService(core);
      const setupContract = service.setup();
      const onEnd = jest.fn();
      const observer = jest.fn((ctx) => (ctx.type === 'task manager' ? onEnd : undefined));
      setupContract.registerActivityObserver(observer);
      return { service, setupContract, observer, onEnd };
    };

    it('ends synchronous activities when the function returns or throws', () => {
      const { setupContract, observer, onEnd } = setup(true);
      expect(setupContract.withContext(context, () => 42)).toBe(42);
      expect(observer).toHaveBeenCalledWith(context);
      expect(onEnd).toHaveBeenCalledTimes(1);

      expect(() =>
        setupContract.withContext(context, () => {
          throw new Error('boom');
        })
      ).toThrow('boom');
      expect(onEnd).toHaveBeenCalledTimes(2);
    });

    it('ends asynchronous activities when the promise settles', async () => {
      const { setupContract, onEnd } = setup(true);
      let resolve: (value: string) => void = () => {};
      const result = setupContract.withContext(
        context,
        () => new Promise<string>((res) => (resolve = res))
      );
      await timer(1);
      expect(onEnd).not.toHaveBeenCalled();
      resolve('done');
      expect(await result).toBe('done');
      expect(onEnd).toHaveBeenCalledTimes(1);

      await expect(
        setupContract.withContext(context, () => Promise.reject(new Error('nope')))
      ).rejects.toThrow('nope');
      expect(onEnd).toHaveBeenCalledTimes(2);
    });

    it("returns a derived promise so that rejections stay the caller's to handle", async () => {
      const { setupContract, onEnd } = setup(true);
      const error = new Error('nope');
      const original = Promise.reject(error);
      const returned = setupContract.withContext(context, () => original);

      // the observer must not mark the caller-visible promise as handled
      expect(returned).not.toBe(original);
      await expect(returned).rejects.toBe(error);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('keeps activities open until non-native thenables settle', async () => {
      const { setupContract, onEnd } = setup(true);
      let resolve: (value: string) => void = () => {};
      const thenable: PromiseLike<string> = {
        then: (onFulfilled, onRejected) =>
          new Promise<string>((res) => (resolve = res)).then(onFulfilled, onRejected),
      };
      const returned = setupContract.withContext(context, () => thenable);
      await timer(1);
      expect(onEnd).not.toHaveBeenCalled();
      resolve('done');
      expect(await returned).toBe('done');
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('ends the activity when probing the result throws', () => {
      const { setupContract, onEnd } = setup(true);
      const hostile = Object.defineProperty({}, 'then', {
        get() {
          throw new Error('bad then');
        },
      });
      expect(() => setupContract.withContext(context, () => hostile)).toThrow('bad then');
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('returns the original promise for untracked contexts', () => {
      const { setupContract } = setup(true);
      const original = Promise.resolve(1);
      expect(setupContract.withContext({ type: 'application' }, () => original)).toBe(original);
    });

    it('observes even when execution context propagation is disabled', () => {
      const { setupContract, onEnd } = setup(false);
      setupContract.withContext(context, () => undefined);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('ignores contexts the observer does not track and undefined contexts', () => {
      const { setupContract, observer, onEnd } = setup(true);
      setupContract.withContext({ type: 'application' }, () => undefined);
      setupContract.withContext(undefined, () => undefined);
      expect(observer).toHaveBeenCalledTimes(1);
      expect(onEnd).not.toHaveBeenCalled();
    });

    it('allows a single observer and clears it on stop', () => {
      const { service, setupContract, observer } = setup(true);
      expect(() => setupContract.registerActivityObserver(jest.fn())).toThrow(/already registered/);
      service.stop();
      setupContract.withContext(context, () => undefined);
      expect(observer).not.toHaveBeenCalled();
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
