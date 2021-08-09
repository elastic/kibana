/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { BehaviorSubject } from 'rxjs';
import {
  ExecutionContextService,
  InternalExecutionContextSetup,
} from './execution_context_service';
import { mockCoreContext } from '../core_context.mock';
import { loggingSystemMock } from '../logging/logging_system.mock';

const delay = (ms: number = 100) => new Promise((resolve) => setTimeout(resolve, ms));
describe('ExecutionContextService', () => {
  describe('setup', () => {
    let service: InternalExecutionContextSetup;
    let core: ReturnType<typeof mockCoreContext.create>;

    beforeEach(() => {
      core = mockCoreContext.create();
      core.configService.atPath.mockReturnValue(new BehaviorSubject({ enabled: true }));
      service = new ExecutionContextService(core).setup();
    });

    it('sets and gets a value in async context', async () => {
      const chainA = Promise.resolve().then(async () => {
        service.set({
          requestId: '0000',
        });
        await delay(500);
        return service.get();
      });

      const chainB = Promise.resolve().then(async () => {
        service.set({
          requestId: '1111',
        });
        await delay(100);
        return service.get();
      });

      expect(
        await Promise.all([chainA, chainB]).then((results) =>
          results.map((result) => result?.toJSON())
        )
      ).toEqual([
        {
          requestId: '0000',
        },
        {
          requestId: '1111',
        },
      ]);
    });

    it('sets and resets a value in async context', async () => {
      const chainA = Promise.resolve().then(async () => {
        service.set({
          requestId: '0000',
        });
        await delay(500);
        service.reset();
        return service.get();
      });

      const chainB = Promise.resolve().then(async () => {
        service.set({
          requestId: '1111',
        });
        await delay(100);
        return service.get();
      });

      expect(
        await Promise.all([chainA, chainB]).then((results) =>
          results.map((result) => result?.toJSON())
        )
      ).toEqual([
        undefined,
        {
          requestId: '1111',
        },
      ]);
    });

    it('emits context to the logs when "set" is called', async () => {
      service.set({
        requestId: '0000',
      });
      expect(loggingSystemMock.collect(core.logger).debug).toMatchInlineSnapshot(`
        Array [
          Array [
            "stored the execution context: {\\"requestId\\":\\"0000\\"}",
          ],
        ]
      `);
    });
  });

  describe('config', () => {
    it('can be disabled', async () => {
      const core = mockCoreContext.create();
      core.configService.atPath.mockReturnValue(new BehaviorSubject({ enabled: false }));
      const service = new ExecutionContextService(core).setup();
      const chainA = await Promise.resolve().then(async () => {
        service.set({
          requestId: '0000',
        });
        await delay(100);
        return service.get();
      });

      expect(chainA).toBeUndefined();
    });

    it('reacts to config changes', async () => {
      const core = mockCoreContext.create();
      const config$ = new BehaviorSubject({ enabled: false });
      core.configService.atPath.mockReturnValue(config$);
      const service = new ExecutionContextService(core).setup();
      function exec() {
        return Promise.resolve().then(async () => {
          service.set({
            requestId: '0000',
          });
          await delay(100);
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
