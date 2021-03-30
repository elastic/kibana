/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ensureValidConfiguration } from './ensure_valid_configuration';
import { configServiceMock } from '../../config/mocks';

describe('ensureValidConfiguration', () => {
  let configService: ReturnType<typeof configServiceMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = configServiceMock.create();
    configService.getUsedPaths.mockReturnValue(Promise.resolve(['core', 'elastic']));
  });

  it('returns normally when there is no unused keys', async () => {
    configService.getUnusedPaths.mockResolvedValue([]);
    await expect(ensureValidConfiguration(configService as any)).resolves.toBeUndefined();
  });

  it('throws when there are some unused keys', async () => {
    configService.getUnusedPaths.mockResolvedValue(['some.key', 'some.other.key']);

    await expect(ensureValidConfiguration(configService as any)).rejects.toMatchInlineSnapshot(
      `[Error: Unknown configuration key(s): "some.key", "some.other.key". Check for spelling errors and ensure that expected plugins are installed.]`
    );
  });
});
