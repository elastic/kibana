/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

  it('passes path to addDeprecation factory', () => {
    const addDeprecation = jest.fn();
    const createAddDeprecation = jest.fn().mockReturnValue(addDeprecation);
    const initialConfig = { foo: 'bar', deprecated: 'deprecated' };

    const handlerA = jest.fn().mockReturnValue({ unset: [{ path: 'deprecated' }] });
    const handlerB = jest.fn().mockReturnValue(undefined);

    applyDeprecations(
      initialConfig,
      [wrapHandler(handlerA, 'pathA'), wrapHandler(handlerB, 'pathB')],
      createAddDeprecation
    );

    expect(createAddDeprecation).toBeCalledTimes(2);
    expect(createAddDeprecation).toHaveBeenNthCalledWith(1, 'pathA');
    expect(createAddDeprecation).toHaveBeenNthCalledWith(2, 'pathB');
  });

  it('calls handlers with correct arguments', () => {
    const addDeprecation = jest.fn();
    const createAddDeprecation = jest.fn().mockReturnValue(addDeprecation);
    const initialConfig = { foo: 'bar', deprecated: 'deprecated' };
    const alteredConfig = { foo: 'bar' };

    const configs: Array<{ fn: string; config: Record<string, any> }> = [];
    const handlerA = jest.fn().mockImplementation((config) => {
      // the first argument is mutated between calls, we store a copy of it
      configs.push({ fn: 'handlerA', config: { ...config } });
      return { unset: [{ path: 'deprecated' }] };
    });
    const handlerB = jest.fn().mockImplementation((config) => {
      configs.push({ fn: 'handlerB', config: { ...config } });
    });

    applyDeprecations(
      initialConfig,
      [wrapHandler(handlerA, 'pathA'), wrapHandler(handlerB, 'pathB')],
      createAddDeprecation
    );

    expect(configs).toEqual([
      { fn: 'handlerA', config: initialConfig },
      { fn: 'handlerB', config: alteredConfig },
    ]);
  });

  it('returns the migrated config', () => {
    const initialConfig = { foo: 'bar', deprecated: 'deprecated', renamed: 'renamed' };

    const { config: migrated } = applyDeprecations(initialConfig, [
      wrapHandler(deprecations.unused('deprecated')),
      wrapHandler(deprecations.rename('renamed', 'newname')),
    ]);

    expect(migrated).toEqual({ foo: 'bar', newname: 'renamed' });
  });

  it('does not alter the initial config', () => {
    const initialConfig = { foo: 'bar', deprecated: 'deprecated' };

    const { config: migrated } = applyDeprecations(initialConfig, [
      wrapHandler(deprecations.unused('deprecated')),
    ]);

    expect(initialConfig).toEqual({ foo: 'bar', deprecated: 'deprecated' });
    expect(migrated).toEqual({ foo: 'bar' });
  });

  it('ignores a command for unknown path', () => {
    const addDeprecation = jest.fn();
    const createAddDeprecation = jest.fn().mockReturnValue(addDeprecation);
    const initialConfig = { foo: 'bar', deprecated: 'deprecated' };

    const handler = jest.fn().mockImplementation((config) => {
      return { unset: [{ path: 'unknown' }] };
    });

    const { config: migrated } = applyDeprecations(
      initialConfig,
      [wrapHandler(handler, 'pathA')],
      createAddDeprecation
    );

    expect(migrated).toEqual(initialConfig);
  });

  it('ignores an unknown command', () => {
    const addDeprecation = jest.fn();
    const createAddDeprecation = jest.fn().mockReturnValue(addDeprecation);
    const initialConfig = { foo: 'bar', deprecated: 'deprecated' };

    const handler = jest.fn().mockImplementation((config) => {
      return { rewrite: [{ path: 'foo' }] };
    });

    const { config: migrated } = applyDeprecations(
      initialConfig,
      [wrapHandler(handler, 'pathA')],
      createAddDeprecation
    );

    expect(migrated).toEqual(initialConfig);
  });

  it('returns a list of changes config paths', () => {
    const addDeprecation = jest.fn();
    const createAddDeprecation = jest.fn().mockReturnValue(addDeprecation);
    const initialConfig = { foo: 'bar', deprecated: 'deprecated' };

    const handler = jest.fn().mockImplementation((config) => {
      return { set: [{ path: 'foo', value: 'bar' }], unset: [{ path: 'baz' }] };
    });

    const { changedPaths } = applyDeprecations(
      initialConfig,
      [wrapHandler(handler, 'pathA')],
      createAddDeprecation
    );

    expect(changedPaths).toEqual({
      set: ['foo'],
      unset: ['baz'],
    });
  });
});
