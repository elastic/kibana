/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

  test('correctly handles server config.', () => {
    const configAdapter = new LegacyObjectToConfigAdapter({
      server: {
        autoListen: true,
        basePath: '/abc',
        cors: false,
        host: 'host',
        maxPayloadBytes: 1000,
        keepaliveTimeout: 5000,
        socketTimeout: 2000,
        port: 1234,
        rewriteBasePath: false,
        ssl: { enabled: true, keyPassphrase: 'some-phrase', someNewValue: 'new' },
        compression: { enabled: true },
        someNotSupportedValue: 'val',
      },
    });

    const configAdapterWithDisabledSSL = new LegacyObjectToConfigAdapter({
      server: {
        autoListen: true,
        basePath: '/abc',
        cors: false,
        host: 'host',
        maxPayloadBytes: 1000,
        keepaliveTimeout: 5000,
        socketTimeout: 2000,
        port: 1234,
        rewriteBasePath: false,
        ssl: { enabled: false, certificate: 'cert', key: 'key' },
        compression: { enabled: true },
        someNotSupportedValue: 'val',
      },
    });

    expect(configAdapter.get('server')).toMatchSnapshot('default');
    expect(configAdapterWithDisabledSSL.get('server')).toMatchSnapshot('disabled ssl');
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
