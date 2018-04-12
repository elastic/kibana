import { System } from './system';
import { KibanaSystem } from './system_types';
import { SystemLoader, KibanaSystemApiFactory } from './system_loader';

// To make types simpler in the tests
type CoreType = void;
const createCoreValues = () => {};

test('starts system with core api', () => {
  expect.assertions(1);

  type KibanaCoreApi = { fromCore: boolean; name: string };
  type Metadata = { configPath?: string };

  class FooSystem extends KibanaSystem<KibanaCoreApi, {}> {
    start() {
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

  type Foo = {
    foo: {
      value: string;
    };
  };

  class FooSystem extends KibanaSystem<CoreType, {}, Foo['foo']> {
    start() {
      return {
        value: 'my-value',
      };
    }
  }

  class BarSystem extends KibanaSystem<CoreType, Foo> {
    start() {
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

  type Foo = {
    foo: {
      fn: (val: string) => string;
    };
  };

  class FooSystem extends KibanaSystem<CoreType, {}, Foo['foo']> {
    start(): Foo['foo'] {
      return {
        fn: val => `test-${val}`,
      };
    }
  }

  class BarSystem extends KibanaSystem<CoreType, Foo> {
    start() {
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

  type Foo = {
    foo: {
      value: string;
    };
  };

  type Bar = {
    bar: {
      value: string;
    };
  };

  class FooSystem extends KibanaSystem<CoreType, {}, Foo['foo']> {
    start(): Foo['foo'] {
      return {
        value: 'value-foo',
      };
    }
  }

  class BarSystem extends KibanaSystem<CoreType, {}, Bar['bar']> {
    start(): Bar['bar'] {
      return {
        value: 'value-bar',
      };
    }
  }

  class QuuxSystem extends KibanaSystem<CoreType, Foo & Bar> {
    start() {
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

  type Grandchild = {
    grandchild: {
      value: string;
    };
  };

  type Child = {
    child: {
      value: string;
    };
  };

  class GrandchildSystem extends KibanaSystem<
    CoreType,
    {},
    Grandchild['grandchild']
  > {
    start() {
      return {
        value: 'grandchild',
      };
    }
  }

  class ChildSystem extends KibanaSystem<CoreType, Grandchild, Child['child']> {
    start() {
      expect(this.deps.grandchild).toEqual({ value: 'grandchild' });

      return {
        value: 'child',
      };
    }
  }

  class ParentSystem extends KibanaSystem<CoreType, Grandchild & Child> {
    start() {
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

  type Child = {
    child: {
      value: {};
    };
  };

  const myRef = {};

  class ChildSystem extends KibanaSystem<CoreType, {}, Child['child']> {
    start() {
      return {
        value: myRef,
      };
    }
  }

  class ParentSystem extends KibanaSystem<CoreType, Child> {
    start() {
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

  type Child = {
    child: {
      value1: number;
      value2: number;
    };
  };

  class ChildSystem extends KibanaSystem<CoreType, {}, Child['child']> {
    start() {
      return {
        value1: 1,
        value2: 2,
      };
    }
  }

  class ParentSystem extends KibanaSystem<CoreType, Child> {
    start() {
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
    start() {}
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
    start() {}
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
    start() {
      events.push('start foo');
    }
    stop() {
      events.push('stop foo');
    }
  }

  class BarSystem extends KibanaSystem<CoreType, {}> {
    start() {
      events.push('start bar');
    }
    stop() {
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

  type Foo = {
    foo: string;
  };

  class FooSystem extends KibanaSystem<CoreType, {}, Foo['foo']> {
    start() {
      return 'value';
    }
  }

  class BarSystem extends KibanaSystem<CoreType, Foo> {
    start() {
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
    start() {
      spy();
    }
  }

  class BarSystem extends KibanaSystem<CoreType, {}> {
    start() {
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
