import { createRegistry } from './create_registry';

test('returns a registry interface', () => {
  const registry = createRegistry<{}>();
  expect(registry).toMatchObject({
    get: expect.any(Function),
    set: expect.any(Function),
    set$: expect.any(Object),
    reset: expect.any(Function),
    reset$: expect.any(Object),
    find: expect.any(Function),
    findBy: expect.any(Function),
    filter: expect.any(Function),
    filterBy: expect.any(Function),
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
  
  registry.reset();
  
  expect(registry.size()).toBe(0);
  expect(registry.get('1')).toBe(undefined);
  expect(registry.get('2')).toBe(undefined);

  registry.set('1', obj);
  expect(registry.size()).toBe(1);
});

test('can find by predicate', () => {
  const registry = createRegistry<any>();
  const a = { id: 'a', name: 'Bob' };
  const b = { id: 'b', name: 'Joe' };

  registry.set('a', a);
  registry.set('b', b);

  expect(registry.find(({id}) => id === 'b')).toBe(b);
  expect(registry.find(({name}) => name === 'Bob')).toBe(a);
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
  
  test('can iterate through registry items', () => {
    const spy = jest.fn();
    
    for (const item of registry.items()) {
      spy(item);
    }
  
    expect(spy).toHaveBeenCalledTimes(2);
    // expect(spy).toHaveBeenCalledWith(b.id);
    // expect(spy).toHaveBeenCalledWith(a.id);
  });
  
});

