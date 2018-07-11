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

import { LegacyConfigToRawConfigAdapter } from '..';
import { LegacyConfigMock } from '../__mocks__/legacy_config_mock';

let legacyConfigMock: LegacyConfigMock;
let configAdapter: LegacyConfigToRawConfigAdapter;
beforeEach(() => {
  legacyConfigMock = new LegacyConfigMock(new Map<string, any>([['__newPlatform', null]]));
  configAdapter = new LegacyConfigToRawConfigAdapter(legacyConfigMock);
});

describe('#get', () => {
  test('correctly handles paths that do not exist in legacy config.', () => {
    expect(() => configAdapter.get('one')).toThrowErrorMatchingSnapshot();
    expect(() => configAdapter.get(['one', 'two'])).toThrowErrorMatchingSnapshot();
    expect(() => configAdapter.get(['one.three'])).toThrowErrorMatchingSnapshot();
  });

  test('returns undefined for new platform config values, even if they do not exist', () => {
    expect(configAdapter.get(['__newPlatform', 'plugins'])).toBe(undefined);
  });

  test('returns new platform config values if they exist', () => {
    configAdapter = new LegacyConfigToRawConfigAdapter(
      new LegacyConfigMock(
        new Map<string, any>([['__newPlatform', { plugins: { scanDirs: ['foo'] } }]])
      )
    );
    expect(configAdapter.get(['__newPlatform', 'plugins'])).toEqual({
      scanDirs: ['foo'],
    });
    expect(configAdapter.get('__newPlatform.plugins')).toEqual({
      scanDirs: ['foo'],
    });
  });

  test('correctly handles paths that do not need to be transformed.', () => {
    legacyConfigMock.rawData = new Map<string, any>([
      ['one', 'value-one'],
      ['one.sub', 'value-one-sub'],
      ['container', { value: 'some' }],
    ]);

    expect(configAdapter.get('one')).toEqual('value-one');
    expect(configAdapter.get(['one', 'sub'])).toEqual('value-one-sub');
    expect(configAdapter.get('one.sub')).toEqual('value-one-sub');
    expect(configAdapter.get('container')).toEqual({ value: 'some' });
  });

  test('correctly handles silent logging config.', () => {
    legacyConfigMock.rawData = new Map([['logging', { silent: true }]]);

    expect(configAdapter.get('logging')).toEqual({
      appenders: {
        default: { kind: 'legacy-appender' },
      },
      root: { level: 'off' },
    });
  });

  test('correctly handles verbose file logging config with json format.', () => {
    legacyConfigMock.rawData = new Map([
      ['logging', { verbose: true, json: true, dest: '/some/path.log' }],
    ]);

    expect(configAdapter.get('logging')).toEqual({
      appenders: {
        default: { kind: 'legacy-appender' },
      },
      root: { level: 'all' },
    });
  });
});

describe('#set', () => {
  test('tries to set values for paths that do not exist in legacy config.', () => {
    expect(() => configAdapter.set('unknown', 'value')).toThrowErrorMatchingSnapshot();

    expect(() =>
      configAdapter.set(['unknown', 'sub1'], 'sub-value-1')
    ).toThrowErrorMatchingSnapshot();

    expect(() => configAdapter.set('unknown.sub2', 'sub-value-2')).toThrowErrorMatchingSnapshot();
  });

  test('correctly sets values for existing paths.', () => {
    legacyConfigMock.rawData = new Map([['known', ''], ['known.sub1', ''], ['known.sub2', '']]);

    configAdapter.set('known', 'value');
    configAdapter.set(['known', 'sub1'], 'sub-value-1');
    configAdapter.set('known.sub2', 'sub-value-2');

    expect(legacyConfigMock.rawData.get('known')).toEqual('value');
    expect(legacyConfigMock.rawData.get('known.sub1')).toEqual('sub-value-1');
    expect(legacyConfigMock.rawData.get('known.sub2')).toEqual('sub-value-2');
  });

  test('correctly sets values for new platform config.', () => {
    legacyConfigMock.rawData = new Map<string, any>([
      ['__newPlatform', { plugins: { scanDirs: ['foo'] } }],
    ]);

    configAdapter = new LegacyConfigToRawConfigAdapter(legacyConfigMock);

    configAdapter.set(['__newPlatform', 'plugins', 'scanDirs'], ['bar']);
    expect(legacyConfigMock.rawData.get('__newPlatform')).toMatchSnapshot();

    configAdapter.set('__newPlatform.plugins.scanDirs', ['baz']);
    expect(legacyConfigMock.rawData.get('__newPlatform')).toMatchSnapshot();
  });
});

describe('#has', () => {
  test('returns false if config is not set', () => {
    expect(configAdapter.has('unknown')).toBe(false);
    expect(configAdapter.has(['unknown', 'sub1'])).toBe(false);
    expect(configAdapter.has('unknown.sub2')).toBe(false);
  });

  test('returns false if new platform config is not set', () => {
    expect(configAdapter.has('__newPlatform.unknown')).toBe(false);
    expect(configAdapter.has(['__newPlatform', 'unknown'])).toBe(false);
  });

  test('returns true if config is set.', () => {
    legacyConfigMock.rawData = new Map([
      ['known', 'foo'],
      ['known.sub1', 'bar'],
      ['known.sub2', 'baz'],
    ]);

    expect(configAdapter.has('known')).toBe(true);
    expect(configAdapter.has(['known', 'sub1'])).toBe(true);
    expect(configAdapter.has('known.sub2')).toBe(true);
  });

  test('returns true if new platform config is set.', () => {
    legacyConfigMock.rawData = new Map<string, any>([
      ['__newPlatform', { known: 'foo', known2: { sub: 'bar' } }],
    ]);

    configAdapter = new LegacyConfigToRawConfigAdapter(legacyConfigMock);

    expect(configAdapter.has('__newPlatform.known')).toBe(true);
    expect(configAdapter.has('__newPlatform.known2')).toBe(true);
    expect(configAdapter.has('__newPlatform.known2.sub')).toBe(true);
    expect(configAdapter.has(['__newPlatform', 'known'])).toBe(true);
    expect(configAdapter.has(['__newPlatform', 'known2'])).toBe(true);
    expect(configAdapter.has(['__newPlatform', 'known2', 'sub'])).toBe(true);
  });
});

test('`getFlattenedPaths` returns paths from new platform config only.', () => {
  legacyConfigMock.rawData = new Map<string, any>([
    ['__newPlatform', { known: 'foo', known2: { sub: 'bar' } }],
    ['legacy', { known: 'baz' }],
  ]);

  configAdapter = new LegacyConfigToRawConfigAdapter(legacyConfigMock);

  expect(configAdapter.getFlattenedPaths()).toMatchSnapshot();
});
