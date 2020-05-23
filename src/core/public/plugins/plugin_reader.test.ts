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

import { CoreWindow, read, UnknownPluginInitializer } from './plugin_reader';

const coreWindow: CoreWindow = window as any;
beforeEach(() => {
  coreWindow.__kbnBundles__ = {};
});

it('handles undefined plugin exports', () => {
  coreWindow.__kbnBundles__['plugin/foo'] = undefined;

  expect(() => {
    read('foo');
  }).toThrowError(`Definition of plugin "foo" not found and may have failed to load.`);
});

it('handles plugin exports with a "plugin" export that is not a function', () => {
  coreWindow.__kbnBundles__['plugin/foo'] = {
    plugin: 1234,
  } as any;

  expect(() => {
    read('foo');
  }).toThrowError(`Definition of plugin "foo" should be a function.`);
});

it('returns the plugin initializer when the "plugin" named export is a function', () => {
  const plugin: UnknownPluginInitializer = () => {
    return undefined as any;
  };

  coreWindow.__kbnBundles__['plugin/foo'] = { plugin };

  expect(read('foo')).toBe(plugin);
});
