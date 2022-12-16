/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { configServiceMock } from '@kbn/config-mocks';
import { ensureValidConfiguration } from './ensure_valid_configuration';
import { CriticalError } from '@kbn/core-base-server-internal';

describe('ensureValidConfiguration', () => {
  let configService: ReturnType<typeof configServiceMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = configServiceMock.create();

    configService.validate.mockResolvedValue();
    configService.getUsedPaths.mockReturnValue(Promise.resolve([]));
  });

  it('returns normally when there is no unused keys and when the config validates', async () => {
    await expect(ensureValidConfiguration(configService as any)).resolves.toBeUndefined();

    expect(configService.validate).toHaveBeenCalledWith(undefined);
  });

  it('forwards parameters to the `validate` method', async () => {
    await expect(
      ensureValidConfiguration(configService as any, { logDeprecations: false })
    ).resolves.toBeUndefined();
    expect(configService.validate).toHaveBeenCalledWith({ logDeprecations: false });

    await expect(
      ensureValidConfiguration(configService as any, { logDeprecations: true })
    ).resolves.toBeUndefined();
    expect(configService.validate).toHaveBeenCalledWith({ logDeprecations: true });
  });

  it('throws when config validation fails', async () => {
    configService.validate.mockImplementation(() => {
      throw new Error('some message');
    });

    await expect(ensureValidConfiguration(configService as any)).rejects.toMatchInlineSnapshot(
      `[Error: some message]`
    );
  });

  it('throws a `CriticalError` with the correct processExitCode value when config validation fails', async () => {
    expect.assertions(2);

    configService.validate.mockImplementation(() => {
      throw new Error('some message');
    });

    try {
      await ensureValidConfiguration(configService as any);
    } catch (e) {
      expect(e).toBeInstanceOf(CriticalError);
      expect(e.processExitCode).toEqual(78);
    }
  });

  it('throws when there are some unused keys', async () => {
    configService.getUnusedPaths.mockResolvedValue(['some.key', 'some.other.key']);

    await expect(ensureValidConfiguration(configService as any)).rejects.toMatchInlineSnapshot(
      `[Error: Unknown configuration key(s): "some.key", "some.other.key". Check for spelling errors and ensure that expected plugins are installed.]`
    );
  });

  it('throws a `CriticalError` with the correct processExitCode value', async () => {
    expect.assertions(2);

    configService.getUnusedPaths.mockResolvedValue(['some.key', 'some.other.key']);

    try {
      await ensureValidConfiguration(configService as any);
    } catch (e) {
      expect(e).toBeInstanceOf(CriticalError);
      expect(e.processExitCode).toEqual(64);
    }
  });

  it('does not throw when all unused keys are included in the ignored paths', async () => {
    configService.getUnusedPaths.mockResolvedValue(['dev.someDevKey', 'elastic.apm.enabled']);

    await expect(ensureValidConfiguration(configService as any)).resolves.toBeUndefined();
  });

  it('throws when only some keys are included in the ignored paths', async () => {
    configService.getUnusedPaths.mockResolvedValue(['dev.someDevKey', 'some.key']);

    await expect(ensureValidConfiguration(configService as any)).rejects.toMatchInlineSnapshot(
      `[Error: Unknown configuration key(s): "some.key". Check for spelling errors and ensure that expected plugins are installed.]`
    );
  });
});
