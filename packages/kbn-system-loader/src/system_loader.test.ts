/* tslint:disable max-classes-per-file */

import { System } from './system';
import { KibanaSystemApiFactory, SystemLoader } from './system_loader';
import { KibanaSystem } from './system_types';

// To make types simpler in the tests
type CoreType = void;
const createCoreValues = () => {};

test('starts system with core api', () => {
  expect.assertions(1);

  interface KibanaCoreApi {
    fromCore: boolean;
    name: string;
  }
  interface Metadata {
    configPath?: string;
  }

  class FooSystem extends KibanaSystem<KibanaCoreApi, {}> {
    public start() {
      expect(this.kibana).toEqual({
        name: 'foo',
        fromCore: true,
        metadata: {
          configPath: 'config.path.foo',
        },
      });
    }
  }

  const foo = new System('foo', {
    metadata: {
      configPath: 'config.path.foo',
    },
    implementation: FooSystem,
  });

  const createSystemApi: KibanaSystemApiFactory<KibanaCoreApi, Metadata> = (
    name,
    metadata
  ) => {
    return {
      name,
      metadata,
      fromCore: true,
    };
  };

  const systems = new SystemLoader(createSystemApi);
  systems.addSystem(foo);

  systems.startSystems();
});

test('system can expose a value', () => {
  expect.assertions(1);

  interface Foo {
    foo: {
      value: string;
    };
  }

  class FooSystem extends KibanaSystem<CoreType, {}, Foo['foo']> {
    public start() {
      return {
        value: 'my-value',
      };
    }
  }

  class BarSystem extends KibanaSystem<CoreType, Foo> {
    public start() {
      expect(this.deps.foo).toEqual({ value: 'my-value' });
    }
  }

  const foo = new System('foo', {
    implementation: FooSystem,
  });

  const bar = new System('bar', {
    dependencies: ['foo'],
    implementation: BarSystem,
  });

  const systems = new SystemLoader(createCoreValues);
  systems.addSystem(foo);
  systems.addSystem(bar);
  systems.startSystems();
});

test('system can expose a function', () => {
  expect.assertions(2);

  interface Foo {
    foo: {
      fn: (val: string) => string;
    };
  }

  class FooSystem extends KibanaSystem<CoreType, {}, Foo['foo']> {
    public start(): Foo['foo'] {
      return {
        fn: val => `test-${val}`,
      };
    }
  }

  class BarSystem extends KibanaSystem<CoreType, Foo> {
    public start() {
      expect(this.deps.foo).toBeDefined();
      expect(this.deps.foo.fn('some-value')).toBe('test-some-value');
    }
  }

  const foo = new System('foo', {
    implementation: FooSystem,
  });

  const bar = new System('bar', {
    dependencies: ['foo'],
    implementation: BarSystem,
  });

  const systems = new SystemLoader(createCoreValues);
  systems.addSystem(foo);
  systems.addSystem(bar);
  systems.startSystems();
});

test('can expose value with same name across multiple systems', () => {
  expect.assertions(2);

  interface Foo {
    foo: {
      value: string;
    };
  }

  interface Bar {
    bar: {
      value: string;
    };
  }

  class FooSystem extends KibanaSystem<CoreType, {}, Foo['foo']> {
    public start(): Foo['foo'] {
      return {
        value: 'value-foo',
      };
    }
  }

  class BarSystem extends KibanaSystem<CoreType, {}, Bar['bar']> {
    public start(): Bar['bar'] {
      return {
        value: 'value-bar',
      };
    }
  }

  class QuuxSystem extends KibanaSystem<CoreType, Foo & Bar> {
    public start() {
      expect(this.deps.foo).toEqual({ value: 'value-foo' });
      expect(this.deps.bar).toEqual({ value: 'value-bar' });
    }
  }

  const foo = new System('foo', {
    implementation: FooSystem,
  });

  const bar = new System('bar', {
    implementation: BarSystem,
  });

  const quux = new System('quux', {
    dependencies: ['foo', 'bar'],
    implementation: QuuxSystem,
  });

  const systems = new SystemLoader(createCoreValues);
  systems.addSystem(foo);
  systems.addSystem(bar);
  systems.addSystem(quux);
  systems.startSystems();
});

test('receives values from dependencies but not transitive dependencies', () => {
  expect.assertions(3);

  interface Grandchild {
    grandchild: {
      value: string;
    };
  }

  interface Child {
    child: {
      value: string;
    };
  }

  class GrandchildSystem extends KibanaSystem<
    CoreType,
    {},
    Grandchild['grandchild']
  > {
    public start() {
      return {
        value: 'grandchild',
      };
    }
  }

  class ChildSystem extends KibanaSystem<CoreType, Grandchild, Child['child']> {
    public start() {
      expect(this.deps.grandchild).toEqual({ value: 'grandchild' });

      return {
        value: 'child',
      };
    }
  }

  class ParentSystem extends KibanaSystem<CoreType, Grandchild & Child> {
    public start() {
      expect(this.deps.child).toEqual({ value: 'child' });
      expect(this.deps.grandchild).toBeUndefined();
    }
  }

  const grandchild = new System('grandchild', {
    implementation: GrandchildSystem,
  });

  const child = new System('child', {
    dependencies: ['grandchild'],
    implementation: ChildSystem,
  });

  const parent = new System('parent', {
    dependencies: ['child'],
    implementation: ParentSystem,
  });

  const systems = new SystemLoader(createCoreValues);
  systems.addSystem(grandchild);
  systems.addSystem(child);
  systems.addSystem(parent);
  systems.startSystems();
});

test('keeps reference on registered value', () => {
  expect.assertions(1);

  interface Child {
    child: {
      value: {};
    };
  }

  const myRef = {};

  class ChildSystem extends KibanaSystem<CoreType, {}, Child['child']> {
    public start() {
      return {
        value: myRef,
      };
    }
  }

  class ParentSystem extends KibanaSystem<CoreType, Child> {
    public start() {
      expect(this.deps.child.value).toBe(myRef);
    }
  }

  const child = new System('child', {
    implementation: ChildSystem,
  });

  const parent = new System('parent', {
    dependencies: ['child'],
    implementation: ParentSystem,
  });

  const systems = new SystemLoader(createCoreValues);
  systems.addSystem(child);
  systems.addSystem(parent);
  systems.startSystems();
});

test('can register multiple values in single system', () => {
  expect.assertions(1);

  interface Child {
    child: {
      value1: number;
      value2: number;
    };
  }

  class ChildSystem extends KibanaSystem<CoreType, {}, Child['child']> {
    public start() {
      return {
        value1: 1,
        value2: 2,
      };
    }
  }

  class ParentSystem extends KibanaSystem<CoreType, Child> {
    public start() {
      expect(this.deps.child).toEqual({
        value1: 1,
        value2: 2,
      });
    }
  }

  const child = new System('child', {
    implementation: ChildSystem,
  });

  const parent = new System('parent', {
    dependencies: ['child'],
    implementation: ParentSystem,
  });

  const systems = new SystemLoader(createCoreValues);
  systems.addSystem(child);
  systems.addSystem(parent);
  systems.startSystems();
});

test("throws if starting a system that depends on a system that's not present", () => {
  class FooSystem extends KibanaSystem<CoreType, {}> {
    public start() {}
  }

  const foo = new System('foo', {
    dependencies: ['does-not-exist'],
    implementation: FooSystem,
  });

  const systems = new SystemLoader(createCoreValues);

  systems.addSystem(foo);

  expect(() => {
    systems.startSystems();
  }).toThrowErrorMatchingSnapshot();
});

test("throws if adding that has the same name as a system that's already added", () => {
  class FooSystem extends KibanaSystem<CoreType, {}> {
    public start() {}
  }

  const foo = new System('foo', {
    implementation: FooSystem,
  });

  const systems = new SystemLoader(createCoreValues);

  systems.addSystem(foo);
  expect(() => {
    systems.addSystem(foo);
  }).toThrowErrorMatchingSnapshot();
});

test('stops systems in reverse order of their starting order', () => {
  const events: string[] = [];

  class FooSystem extends KibanaSystem<CoreType, {}> {
    public start() {
      events.push('start foo');
    }
    public stop() {
      events.push('stop foo');
    }
  }

  class BarSystem extends KibanaSystem<CoreType, {}> {
    public start() {
      events.push('start bar');
    }
    public stop() {
      events.push('stop bar');
    }
  }

  const foo = new System('foo', {
    implementation: FooSystem,
  });
  const bar = new System('bar', {
    implementation: BarSystem,
  });

  const systems = new SystemLoader(createCoreValues);

  systems.addSystem(foo);
  systems.addSystem(bar);

  systems.startSystems();
  systems.stopSystems();

  expect(events).toEqual(['start bar', 'start foo', 'stop foo', 'stop bar']);
});

test('can add systems before adding its dependencies', () => {
  expect.assertions(1);

  interface Foo {
    foo: string;
  }

  class FooSystem extends KibanaSystem<CoreType, {}, Foo['foo']> {
    public start() {
      return 'value';
    }
  }

  class BarSystem extends KibanaSystem<CoreType, Foo> {
    public start() {
      expect(this.deps.foo).toBe('value');
    }
  }

  const foo = new System('foo', {
    implementation: FooSystem,
  });

  const bar = new System('bar', {
    dependencies: ['foo'],
    implementation: BarSystem,
  });

  const systems = new SystemLoader(createCoreValues);
  // `bar` depends on `foo`, but we add it first
  systems.addSystem(bar);
  systems.addSystem(foo);
  systems.startSystems();
});

test('can add multiple system specs at the same time', () => {
  expect.assertions(1);

  const spy = jest.fn();

  class FooSystem extends KibanaSystem<CoreType, {}> {
    public start() {
      spy();
    }
  }

  class BarSystem extends KibanaSystem<CoreType, {}> {
    public start() {
      spy();
    }
  }

  const foo = new System('foo', {
    implementation: FooSystem,
  });

  const bar = new System('bar', {
    implementation: BarSystem,
  });

  const systems = new SystemLoader(createCoreValues);
  systems.addSystems([foo, bar]);
  systems.startSystems();

  expect(spy).toHaveBeenCalledTimes(2);
});
