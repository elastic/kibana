/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LegacyObjectToConfigAdapter } from './legacy_object_to_config_adapter';

describe('#get', () => {
  test('correctly handles paths that do not exist.', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({});

    expect(configAdapter.get('one')).not.toBeDefined();
    expect(configAdapter.get(['one', 'two'])).not.toBeDefined();
    expect(configAdapter.get(['one.three'])).not.toBeDefined();
  });

  test('correctly handles paths that do not need to be transformed.', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({
      one: 'value-one',
      two: {
        sub: 'value-two-sub',
      },
      container: {
        value: 'some',
      },
    });

    expect(configAdapter.get('one')).toEqual('value-one');
    expect(configAdapter.get(['two', 'sub'])).toEqual('value-two-sub');
    expect(configAdapter.get('two.sub')).toEqual('value-two-sub');
    expect(configAdapter.get('container')).toEqual({ value: 'some' });
  });

  test('correctly handles csp config.', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({
      csp: {
        rules: ['strict'],
      },
    });

    expect(configAdapter.get('csp')).toMatchInlineSnapshot(`
      Object {
        "rules": Array [
          "strict",
        ],
      }
    `);
  });

  test('correctly handles silent logging config.', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({
      logging: { silent: true },
    });

    expect(configAdapter.get('logging')).toMatchSnapshot();
  });

  test('correctly handles verbose file logging config with json format.', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({
      logging: { verbose: true, json: true, dest: '/some/path.log' },
    });

    expect(configAdapter.get('logging')).toMatchSnapshot();
  });
});

describe('#set', () => {
  test('correctly sets values for paths that do not exist.', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({});

    configAdapter.set('unknown', 'value');
    configAdapter.set(['unknown', 'sub1'], 'sub-value-1');
    configAdapter.set('unknown.sub2', 'sub-value-2');

    expect(configAdapter.toRaw()).toMatchSnapshot();
  });

  test('correctly sets values for existing paths.', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({
      known: '',
      knownContainer: {
        sub1: 'sub-1',
        sub2: 'sub-2',
      },
    });

    configAdapter.set('known', 'value');
    configAdapter.set(['knownContainer', 'sub1'], 'sub-value-1');
    configAdapter.set('knownContainer.sub2', 'sub-value-2');

    expect(configAdapter.toRaw()).toMatchSnapshot();
  });
});

describe('#has', () => {
  test('returns false if config is not set', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({});

    expect(configAdapter.has('unknown')).toBe(false);
    expect(configAdapter.has(['unknown', 'sub1'])).toBe(false);
    expect(configAdapter.has('unknown.sub2')).toBe(false);
  });

  test('returns true if config is set.', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({
      known: 'foo',
      knownContainer: {
        sub1: 'bar',
        sub2: 'baz',
      },
    });

    expect(configAdapter.has('known')).toBe(true);
    expect(configAdapter.has(['knownContainer', 'sub1'])).toBe(true);
    expect(configAdapter.has('knownContainer.sub2')).toBe(true);
  });
});

describe('#toRaw', () => {
  test('returns a deep copy of the underlying raw config object.', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({
      known: 'foo',
      knownContainer: {
        sub1: 'bar',
        sub2: 'baz',
      },
      legacy: { known: 'baz' },
    });

    const firstRawCopy = configAdapter.toRaw();

    configAdapter.set('known', 'bar');
    configAdapter.set(['knownContainer', 'sub1'], 'baz');

    const secondRawCopy = configAdapter.toRaw();

    expect(firstRawCopy).not.toBe(secondRawCopy);
    expect(firstRawCopy.knownContainer).not.toBe(secondRawCopy.knownContainer);

    expect(firstRawCopy).toMatchSnapshot();
    expect(secondRawCopy).toMatchSnapshot();
  });
});

describe('#getFlattenedPaths', () => {
  test('returns all paths of the underlying object.', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({
      known: 'foo',
      knownContainer: {
        sub1: 'bar',
        sub2: 'baz',
      },
      legacy: { known: 'baz' },
    });

    expect(configAdapter.getFlattenedPaths()).toMatchSnapshot();
  });
});
