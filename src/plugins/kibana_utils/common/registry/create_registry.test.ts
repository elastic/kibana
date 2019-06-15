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

import { createRegistry } from './create_registry';

test('returns a registry interface', () => {
  const registry = createRegistry<{}>();
  expect(registry).toMatchObject({
    get: expect.any(Function),
    set: expect.any(Function),
    set$: expect.any(Object),
    clear: expect.any(Function),
    clear$: expect.any(Object),
    find: expect.any(Function),
    findBy: expect.any(Function),
    filter: expect.any(Function),
    filterBy: expect.any(Function),
    size: expect.any(Function),
    ids: expect.any(Function),
    records: expect.any(Function),
  });
});

test('can set item', () => {
  const registry = createRegistry<any>();
  registry.set('123', {});
});

test('can get item (and stores the original object)', () => {
  const registry = createRegistry<any>();
  const obj = { foo: 'bar' };

  registry.set('123', obj);
  const item = registry.get('123');

  expect(item).toBe(obj);
});

test('can rewrite item', () => {
  const registry = createRegistry<any>();

  registry.set('123', { foo: 'bar' });
  registry.set('123', { fooz: 'baz' });
  const item = registry.get('123');

  expect(item).toEqual({ fooz: 'baz' });
});

test('count() returns registry size', () => {
  const registry = createRegistry<any>();

  expect(registry.size()).toBe(0);
  registry.set('1', { foo: 'bar' });
  expect(registry.size()).toBe(1);
  registry.set('2', { foo: 'bar' });
  expect(registry.size()).toBe(2);
});

test('can store same object multiple times', () => {
  const registry = createRegistry<any>();
  const obj = { foo: 'bar' };

  registry.set('1', obj);
  registry.set('2', obj);
  registry.set('3', obj);

  expect(registry.size()).toBe(3);
});

test('get() returns object by ID or undefined', () => {
  const registry = createRegistry<any>();

  registry.set('a', { id: 'a' });
  registry.set('b', { id: 'b' });

  expect(registry.get('a')).toEqual({ id: 'a' });
  expect(registry.get('b')).toEqual({ id: 'b' });
  expect(registry.get('c')).toBe(undefined);
});

test('can store comples objects', () => {
  const date = new Date();
  const registry = createRegistry<{ date: Date }>();

  registry.set('25', { date });
  const res = registry.get('25');

  expect(res!.date.getTime()).toBe(date.getTime());
});

test('can remove all items', () => {
  const registry = createRegistry<any>();
  const obj = { foo: 'bar' };

  registry.set('1', obj);
  registry.set('2', obj);

  expect(registry.size()).toBe(2);

  registry.clear();

  expect(registry.size()).toBe(0);
  expect(registry.get('1')).toBe(undefined);
  expect(registry.get('2')).toBe(undefined);

  registry.set('1', obj);
  expect(registry.size()).toBe(1);
});

describe('iterators', () => {
  const registry = createRegistry<any>();
  const a = { id: 'a', name: 'Bob' };
  const b = { id: 'b', name: 'Joe' };
  registry.set(a.id, a);
  registry.set(b.id, b);

  test('registry is iterable', () => {
    const spy = jest.fn();

    for (const item of registry) {
      spy(item);
    }

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith([b.id, b]);
    expect(spy).toHaveBeenCalledWith([a.id, a]);
  });

  test('can iterate through registry ids', () => {
    const spy = jest.fn();

    for (const item of registry.ids()) {
      spy(item);
    }

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(b.id);
    expect(spy).toHaveBeenCalledWith(a.id);
  });

  test('can iterate through registry records', () => {
    const spy = jest.fn();

    for (const item of registry.records()) {
      spy(item);
    }

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(a);
    expect(spy).toHaveBeenCalledWith(b);
  });
});

describe('search', () => {
  describe('filter()', () => {
    const registry = createRegistry<any>();
    const { filter } = registry;
    const a = { id: 'a', name: 'Bob' };
    const b = { id: 'b', name: 'Joe' };
    const c = { id: 'c', name: 'Bob' };
    registry.set('a', a);
    registry.set('c', c);
    registry.set('b', b);

    test('returns an iterable', () => {
      const iterable = filter(({ name }) => name === 'Bob');
      for (const _ of iterable);
      expect(typeof iterable[Symbol.iterator]).toBe('function');
    });

    test('iterates through all matched records', () => {
      const records = [...filter(({ name }) => name === 'Bob')];
      expect(records).toHaveLength(2);
    });

    test('returns original records', () => {
      const records = [...filter(({ name }) => name === 'Bob')];
      records.sort((record1, record2) => (record1.id > record2.id ? 1 : -1));
      expect(records[0]).toEqual(a);
      expect(records[1]).toEqual(c);
    });
  });

  describe('filterBy()', () => {
    const registry = createRegistry<any>();
    const { filterBy } = registry;
    const a = { id: 'a', name: 'Bob' };
    const b = { id: 'b', name: 'Joe' };
    const c = { id: 'c', name: 'Bob' };
    registry.set('a', a);
    registry.set('c', c);
    registry.set('b', b);

    test('returns an iterable', () => {
      const iterable = filterBy('name', 'Bob');
      for (const _ of iterable);
      expect(typeof iterable[Symbol.iterator]).toBe('function');
    });

    test('iterates through all matched records', () => {
      const records = [...filterBy('name', 'Bob')];
      expect(records).toHaveLength(2);
    });

    test('returns original records', () => {
      const records = [...filterBy('name', 'Bob')];
      records.sort((record1, record2) => (record1.id > record2.id ? 1 : -1));
      expect(records[0]).toEqual(a);
      expect(records[1]).toEqual(c);
    });
  });

  describe('find', () => {
    const registry = createRegistry<{ id: string; name: string }>();
    const a = { id: 'a', name: 'Bob' };
    const b = { id: 'b', name: 'Joe' };
    registry.set('a', a);
    registry.set('b', b);

    describe('find()', () => {
      const { find } = registry;

      test('can find by predicate', () => {
        expect(find(({ id }) => id === 'b')).toBe(b);
        expect(find(({ name }) => name === 'Bob')).toBe(a);
      });

      test('returns undefined if item not found', () => {
        expect(find(({ id }) => id === 'c')).toBe(undefined);
        expect(find(({ name }) => name === 'John')).toBe(undefined);
      });

      test('returns original objects', () => {
        const aa = find(({ id }) => id === 'a');
        expect(aa).toBe(a);
      });
    });

    describe('findBy()', () => {
      const { findBy } = registry;

      test('can find by predicate', () => {
        expect(findBy('id', 'b')).toBe(b);
        expect(findBy('name', 'Bob')).toBe(a);
      });

      test('returns undefined if item not found', () => {
        expect(findBy('id', 'c')).toBe(undefined);
        expect(findBy('name', 'John')).toBe(undefined);
      });

      test('returns original objects', () => {
        const aa = findBy('id', 'a');
        expect(aa).toBe(a);
      });
    });
  });
});
