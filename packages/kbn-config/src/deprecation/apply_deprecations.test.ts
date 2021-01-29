/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { applyDeprecations } from './apply_deprecations';
import { ConfigDeprecation, ConfigDeprecationWithContext } from './types';
import { configDeprecationFactory as deprecations } from './deprecation_factory';

const wrapHandler = (
  handler: ConfigDeprecation,
  path: string = ''
): ConfigDeprecationWithContext => ({
  deprecation: handler,
  path,
});

describe('applyDeprecations', () => {
  it('calls all deprecations handlers once', () => {
    const handlerA = jest.fn();
    const handlerB = jest.fn();
    const handlerC = jest.fn();
    applyDeprecations(
      {},
      [handlerA, handlerB, handlerC].map((h) => wrapHandler(h))
    );
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
    expect(handlerC).toHaveBeenCalledTimes(1);
  });

  it('calls handlers with correct arguments', () => {
    const logger = () => undefined;
    const initialConfig = { foo: 'bar', deprecated: 'deprecated' };
    const alteredConfig = { foo: 'bar' };

    const handlerA = jest.fn().mockReturnValue(alteredConfig);
    const handlerB = jest.fn().mockImplementation((conf) => conf);

    applyDeprecations(
      initialConfig,
      [wrapHandler(handlerA, 'pathA'), wrapHandler(handlerB, 'pathB')],
      logger
    );

    expect(handlerA).toHaveBeenCalledWith(initialConfig, 'pathA', logger);
    expect(handlerB).toHaveBeenCalledWith(alteredConfig, 'pathB', logger);
  });

  it('returns the migrated config', () => {
    const initialConfig = { foo: 'bar', deprecated: 'deprecated', renamed: 'renamed' };

    const migrated = applyDeprecations(initialConfig, [
      wrapHandler(deprecations.unused('deprecated')),
      wrapHandler(deprecations.rename('renamed', 'newname')),
    ]);

    expect(migrated).toEqual({ foo: 'bar', newname: 'renamed' });
  });

  it('does not alter the initial config', () => {
    const initialConfig = { foo: 'bar', deprecated: 'deprecated' };

    const migrated = applyDeprecations(initialConfig, [
      wrapHandler(deprecations.unused('deprecated')),
    ]);

    expect(initialConfig).toEqual({ foo: 'bar', deprecated: 'deprecated' });
    expect(migrated).toEqual({ foo: 'bar' });
  });
});
