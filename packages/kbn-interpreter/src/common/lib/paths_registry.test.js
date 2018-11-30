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

describe('pathsRegistry', () => {
  let registry;
  beforeEach(() => {
    jest.resetModules();
    registry = require('./paths_registry').pathsRegistry;
  });

  const paths = {
    foo: 'bar',
    sometype: [
      'Here',
      'be',
      'more',
      'paths!'
    ],
    anothertype: ['with just one lonely path']
  };

  it('throws when no type is provided', () => {
    const check = () => registry.register(null, paths.foo);
    expect(check).toThrowError(/requires a type/);
  });

  it('accepts paths as a string', () => {
    registry.register('foo', paths.foo);
    expect(registry.get('foo')).toEqual([paths.foo]);
  });

  it('accepts paths as an array', () => {
    registry.register('sometype', paths.sometype);
    expect(registry.get('sometype')).toEqual(paths.sometype);
  });

  it('ignores case when setting items', () => {
    registry.register('FOO', paths.foo);
    expect(registry.get('foo')).toEqual([paths.foo]);
  });

  it('gets items by lookup property', () => {
    registry.register('sometype', paths.sometype);
    expect(registry.get('sometype')).toEqual(paths.sometype);
  });

  it('can register an object of `type: path` key-value pairs', () => {
    registry.registerAll(paths);
    expect(registry.get('foo')).toEqual([paths.foo]);
    expect(registry.get('sometype')).toEqual(paths.sometype);
    expect(registry.get('anothertype')).toEqual(paths.anothertype);
  });

  it('ignores case when getting items', () => {
    registry.registerAll(paths);
    expect(registry.get('FOO')).toEqual([paths.foo]);
    expect(registry.get('SOmEType')).toEqual(paths.sometype);
    expect(registry.get('anoThertYPE')).toEqual(paths.anothertype);
  });

  it('returns an empty array with no match', () => {
    expect(registry.get('@@nope_nope')).toEqual([]);
  });

  it('returns an array of all path values', () => {
    registry.registerAll(paths);
    expect(registry.toArray()).toEqual([[paths.foo], paths.sometype, paths.anothertype]);
  });

  it('resets the registry', () => {
    registry.registerAll(paths);
    expect(registry.get('sometype')).toEqual(paths.sometype);
    registry.reset();
    expect(registry.get('sometype')).toEqual([]);
  });
});