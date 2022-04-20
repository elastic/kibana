/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import { LoggerFactory } from '@kbn/logging';
import { Env } from '@kbn/config';
import { getEnvOptions } from '../config/mocks';
import { configServiceMock, loggingSystemMock } from '../mocks';

import { PrebootService } from './preboot_service';

function nextTick() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('PrebootService', () => {
  describe('#preboot()', () => {
    let service: PrebootService;
    let logger: LoggerFactory;
    beforeEach(() => {
      logger = loggingSystemMock.create();
      service = new PrebootService({
        configService: configServiceMock.create(),
        env: Env.createDefault(REPO_ROOT, getEnvOptions()),
        logger,
        coreId: Symbol(),
      });
    });

    it('returns a proper contract', () => {
      expect(service.preboot()).toMatchInlineSnapshot(`
        Object {
          "holdSetupUntilResolved": [Function],
          "isSetupOnHold": [Function],
          "waitUntilCanSetup": [Function],
        }
      `);
    });

    it('#isSetupOnHold correctly determines if `setup` is on hold', async () => {
      const preboot = service.preboot();

      expect(preboot.isSetupOnHold()).toBe(false);

      let resolveFirstPromise: (value?: { shouldReloadConfig: boolean }) => void;
      preboot.holdSetupUntilResolved(
        'some-plugin',
        'some-reason',
        new Promise<{ shouldReloadConfig: boolean } | undefined>((resolve) => {
          resolveFirstPromise = resolve;
        })
      );

      let resolveSecondPromise: (value?: { shouldReloadConfig: boolean }) => void;
      preboot.holdSetupUntilResolved(
        'some-other-plugin',
        'some-other-reason',
        new Promise<{ shouldReloadConfig: boolean } | undefined>((resolve) => {
          resolveSecondPromise = resolve;
        })
      );

      expect(preboot.isSetupOnHold()).toBe(true);
      const waitUntilPromise = preboot.waitUntilCanSetup();

      resolveFirstPromise!();
      await nextTick();
      expect(preboot.isSetupOnHold()).toBe(true);

      resolveSecondPromise!();
      await nextTick();
      expect(preboot.isSetupOnHold()).toBe(false);

      await expect(waitUntilPromise).resolves.toEqual({ shouldReloadConfig: false });
    });

    it('#holdSetupUntilResolved logs a reason', async () => {
      const preboot = service.preboot();

      preboot.holdSetupUntilResolved(
        'some-plugin',
        'some-reason',
        Promise.resolve({ shouldReloadConfig: true })
      );
      preboot.holdSetupUntilResolved(
        'some-other-plugin',
        'some-other-reason',
        Promise.resolve(undefined)
      );

      expect(loggingSystemMock.collect(logger).info).toMatchInlineSnapshot(`
        Array [
          Array [
            "\\"some-plugin\\" plugin is holding setup: some-reason",
          ],
          Array [
            "\\"some-other-plugin\\" plugin is holding setup: some-other-reason",
          ],
        ]
      `);

      await expect(preboot.waitUntilCanSetup()).resolves.toEqual({ shouldReloadConfig: true });
    });

    it('#holdSetupUntilResolved does not allow to register new promises after #waitUntilCanSetup is called', async () => {
      const preboot = service.preboot();

      preboot.holdSetupUntilResolved(
        'some-plugin',
        'some-reason',
        Promise.resolve({ shouldReloadConfig: true })
      );

      const waitUntilPromise = preboot.waitUntilCanSetup();

      expect(() =>
        preboot.holdSetupUntilResolved(
          'some-other-plugin',
          'some-other-reason',
          Promise.resolve(undefined)
        )
      ).toThrowErrorMatchingInlineSnapshot(`"Cannot hold boot at this stage."`);

      expect(loggingSystemMock.collect(logger).info).toMatchInlineSnapshot(`
        Array [
          Array [
            "\\"some-plugin\\" plugin is holding setup: some-reason",
          ],
        ]
      `);

      await expect(waitUntilPromise).resolves.toEqual({ shouldReloadConfig: true });
    });

    it('#waitUntilCanSetup returns `shouldReloadConfig` set to `true` if at least one promise did it', async () => {
      const preboot = service.preboot();

      expect(preboot.isSetupOnHold()).toBe(false);

      let resolveFirstPromise: (value?: { shouldReloadConfig: boolean }) => void;
      preboot.holdSetupUntilResolved(
        'some-plugin',
        'some-reason',
        new Promise<{ shouldReloadConfig: boolean } | undefined>((resolve) => {
          resolveFirstPromise = resolve;
        })
      );

      let resolveSecondPromise: (value?: { shouldReloadConfig: boolean }) => void;
      preboot.holdSetupUntilResolved(
        'some-other-plugin',
        'some-other-reason',
        new Promise<{ shouldReloadConfig: boolean } | undefined>((resolve) => {
          resolveSecondPromise = resolve;
        })
      );

      expect(preboot.isSetupOnHold()).toBe(true);
      const waitUntilPromise = preboot.waitUntilCanSetup();

      resolveFirstPromise!({ shouldReloadConfig: true });
      await nextTick();
      expect(preboot.isSetupOnHold()).toBe(true);

      resolveSecondPromise!({ shouldReloadConfig: false });
      await nextTick();
      expect(preboot.isSetupOnHold()).toBe(false);

      await expect(waitUntilPromise).resolves.toEqual({ shouldReloadConfig: true });
    });

    it('#waitUntilCanSetup is rejected if at least one promise is rejected', async () => {
      const preboot = service.preboot();

      preboot.holdSetupUntilResolved(
        'some-plugin',
        'some-reason',
        Promise.resolve({ shouldReloadConfig: true })
      );
      preboot.holdSetupUntilResolved(
        'some-other-plugin',
        'some-other-reason',
        Promise.reject('Uh oh!')
      );

      await expect(preboot.waitUntilCanSetup()).rejects.toBe('Uh oh!');
    });
  });
});
