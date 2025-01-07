/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreWindow, read } from './plugin_reader';

const coreWindow: CoreWindow & {
  __kbnBundles__: { stub(key: string, value: any): void };
} = window as any;

beforeEach(() => {
  const stubs = new Map<string, any>();
  coreWindow.__kbnBundles__ = {
    get(key) {
      return stubs.get(key);
    },
    has(key) {
      return stubs.has(key);
    },
    stub(key, value) {
      stubs.set(key, value);
    },
  };
});

it('handles undefined plugin exports', () => {
  expect(() => {
    read('foo');
  }).toThrowError(`Definition of plugin "foo" not found and may have failed to load.`);
});

it('handles plugin exports with a "plugin" export that is not a function', () => {
  coreWindow.__kbnBundles__.stub('plugin/foo/public', {
    plugin: 1234,
  });

  expect(() => {
    read('foo');
  }).toThrowError(`Definition of plugin "foo" should be a function.`);
});

it('returns the plugin initializer when the "plugin" named export is a function', () => {
  const plugin = () => {};
  coreWindow.__kbnBundles__.stub('plugin/foo/public', { plugin });

  expect(read('foo')).toBe(plugin);
});
