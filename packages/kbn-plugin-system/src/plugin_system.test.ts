import { PluginSpec } from './plugin_spec';
import { KibanaPlugin } from './plugin';
import { PluginSystem } from './plugin_system';

// To make types simpler in the tests
type CoreType = void;
const createCoreValues = () => {};

test('starts plugin with core api', () => {
  expect.assertions(1);

  type KibanaCoreApi = { fromCore: boolean; name: string };

  class FooPlugin extends KibanaPlugin<KibanaCoreApi, {}> {
    start() {
      expect(this.kibana).toEqual({ name: 'foo', fromCore: true });
    }
  }

  const foo = new PluginSpec('foo', {
    plugin: FooPlugin,
  });

  const plugins = new PluginSystem(pluginName => ({
    name: pluginName,
    fromCore: true,
  }));
  plugins.addPluginSpec(foo);

  plugins.startPlugins();
});

test('plugin can expose a value', () => {
  expect.assertions(1);

  type Foo = {
    foo: {
      value: string;
    };
  };

  class FooPlugin extends KibanaPlugin<CoreType, {}, Foo['foo']> {
    start() {
      return {
        value: 'my-value',
      };
    }
  }

  class BarPlugin extends KibanaPlugin<CoreType, Foo> {
    start() {
      expect(this.deps.foo).toEqual({ value: 'my-value' });
    }
  }

  const foo = new PluginSpec('foo', {
    plugin: FooPlugin,
  });

  const bar = new PluginSpec('bar', {
    dependencies: ['foo'],
    plugin: BarPlugin,
  });

  const plugins = new PluginSystem(createCoreValues);
  plugins.addPluginSpec(foo);
  plugins.addPluginSpec(bar);
  plugins.startPlugins();
});

test('plugin can expose a function', () => {
  expect.assertions(2);

  type Foo = {
    foo: {
      fn: (val: string) => string;
    };
  };

  class FooPlugin extends KibanaPlugin<CoreType, {}, Foo['foo']> {
    start(): Foo['foo'] {
      return {
        fn: val => `test-${val}`,
      };
    }
  }

  class BarPlugin extends KibanaPlugin<CoreType, Foo> {
    start() {
      expect(this.deps.foo).toBeDefined();
      expect(this.deps.foo.fn('some-value')).toBe('test-some-value');
    }
  }

  const foo = new PluginSpec('foo', {
    plugin: FooPlugin,
  });

  const bar = new PluginSpec('bar', {
    dependencies: ['foo'],
    plugin: BarPlugin,
  });

  const plugins = new PluginSystem(createCoreValues);
  plugins.addPluginSpec(foo);
  plugins.addPluginSpec(bar);
  plugins.startPlugins();
});

test('can expose value with same name across multiple plugins', () => {
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

  class FooPlugin extends KibanaPlugin<CoreType, {}, Foo['foo']> {
    start(): Foo['foo'] {
      return {
        value: 'value-foo',
      };
    }
  }

  class BarPlugin extends KibanaPlugin<CoreType, {}, Bar['bar']> {
    start(): Bar['bar'] {
      return {
        value: 'value-bar',
      };
    }
  }

  class QuuxPlugin extends KibanaPlugin<CoreType, Foo & Bar> {
    start() {
      expect(this.deps.foo).toEqual({ value: 'value-foo' });
      expect(this.deps.bar).toEqual({ value: 'value-bar' });
    }
  }

  const foo = new PluginSpec('foo', {
    plugin: FooPlugin,
  });

  const bar = new PluginSpec('bar', {
    plugin: BarPlugin,
  });

  const quux = new PluginSpec('quux', {
    dependencies: ['foo', 'bar'],
    plugin: QuuxPlugin,
  });

  const plugins = new PluginSystem(createCoreValues);
  plugins.addPluginSpec(foo);
  plugins.addPluginSpec(bar);
  plugins.addPluginSpec(quux);
  plugins.startPlugins();
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

  class GrandchildPlugin extends KibanaPlugin<
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

  class ChildPlugin extends KibanaPlugin<CoreType, Grandchild, Child['child']> {
    start() {
      expect(this.deps.grandchild).toEqual({ value: 'grandchild' });

      return {
        value: 'child',
      };
    }
  }

  class ParentPlugin extends KibanaPlugin<CoreType, Grandchild & Child> {
    start() {
      expect(this.deps.child).toEqual({ value: 'child' });
      expect(this.deps.grandchild).toBeUndefined();
    }
  }

  const grandchild = new PluginSpec('grandchild', {
    plugin: GrandchildPlugin,
  });

  const child = new PluginSpec('child', {
    dependencies: ['grandchild'],
    plugin: ChildPlugin,
  });

  const parent = new PluginSpec('parent', {
    dependencies: ['child'],
    plugin: ParentPlugin,
  });

  const plugins = new PluginSystem(createCoreValues);
  plugins.addPluginSpec(grandchild);
  plugins.addPluginSpec(child);
  plugins.addPluginSpec(parent);
  plugins.startPlugins();
});

test('keeps reference on registered value', () => {
  expect.assertions(1);

  type Child = {
    child: {
      value: {};
    };
  };

  const myRef = {};

  class ChildPlugin extends KibanaPlugin<CoreType, {}, Child['child']> {
    start() {
      return {
        value: myRef,
      };
    }
  }

  class ParentPlugin extends KibanaPlugin<CoreType, Child> {
    start() {
      expect(this.deps.child.value).toBe(myRef);
    }
  }

  const child = new PluginSpec('child', {
    plugin: ChildPlugin,
  });

  const parent = new PluginSpec('parent', {
    dependencies: ['child'],
    plugin: ParentPlugin,
  });

  const plugins = new PluginSystem(createCoreValues);
  plugins.addPluginSpec(child);
  plugins.addPluginSpec(parent);
  plugins.startPlugins();
});

test('can register multiple values in single plugin', () => {
  expect.assertions(1);

  type Child = {
    child: {
      value1: number;
      value2: number;
    };
  };

  class ChildPlugin extends KibanaPlugin<CoreType, {}, Child['child']> {
    start() {
      return {
        value1: 1,
        value2: 2,
      };
    }
  }

  class ParentPlugin extends KibanaPlugin<CoreType, Child> {
    start() {
      expect(this.deps.child).toEqual({
        value1: 1,
        value2: 2,
      });
    }
  }

  const child = new PluginSpec('child', {
    plugin: ChildPlugin,
  });

  const parent = new PluginSpec('parent', {
    dependencies: ['child'],
    plugin: ParentPlugin,
  });

  const plugins = new PluginSystem(createCoreValues);
  plugins.addPluginSpec(child);
  plugins.addPluginSpec(parent);
  plugins.startPlugins();
});

test("throws if starting a plugin that depends on a plugin that's not yet started", () => {
  class FooPlugin extends KibanaPlugin<CoreType, {}> {
    start() {}
  }

  const foo = new PluginSpec('foo', {
    dependencies: ['does-not-exist'],
    plugin: FooPlugin,
  });

  const plugins = new PluginSystem(createCoreValues);

  plugins.addPluginSpec(foo);

  expect(() => {
    plugins.startPlugins();
  }).toThrowErrorMatchingSnapshot();
});

test("throws if adding that has the same name as a plugin that's already added", () => {
  class FooPlugin extends KibanaPlugin<CoreType, {}> {
    start() {}
  }

  const foo = new PluginSpec('foo', {
    plugin: FooPlugin,
  });

  const plugins = new PluginSystem(createCoreValues);

  plugins.addPluginSpec(foo);
  expect(() => {
    plugins.addPluginSpec(foo);
  }).toThrowErrorMatchingSnapshot();
});

test('stops plugins in reverse order of their starting order', () => {
  const events: string[] = [];

  class FooPlugin extends KibanaPlugin<CoreType, {}> {
    start() {
      events.push('start foo');
    }
    stop() {
      events.push('stop foo');
    }
  }

  class BarPlugin extends KibanaPlugin<CoreType, {}> {
    start() {
      events.push('start bar');
    }
    stop() {
      events.push('stop bar');
    }
  }

  const foo = new PluginSpec('foo', {
    plugin: FooPlugin,
  });
  const bar = new PluginSpec('bar', {
    plugin: BarPlugin,
  });

  const plugins = new PluginSystem(createCoreValues);

  plugins.addPluginSpec(foo);
  plugins.addPluginSpec(bar);

  plugins.startPlugins();
  plugins.stopPlugins();

  expect(events).toEqual(['start bar', 'start foo', 'stop foo', 'stop bar']);
});

test('can add plugins before adding its dependencies', () => {
  expect.assertions(1);

  type Foo = {
    foo: string;
  };

  class FooPlugin extends KibanaPlugin<CoreType, {}, Foo['foo']> {
    start() {
      return 'value';
    }
  }

  class BarPlugin extends KibanaPlugin<CoreType, Foo> {
    start() {
      expect(this.deps.foo).toBe('value');
    }
  }

  const foo = new PluginSpec('foo', {
    plugin: FooPlugin,
  });

  const bar = new PluginSpec('bar', {
    dependencies: ['foo'],
    plugin: BarPlugin,
  });

  const plugins = new PluginSystem(createCoreValues);
  // `bar` depends on `foo`, but we add it first
  plugins.addPluginSpec(bar);
  plugins.addPluginSpec(foo);
  plugins.startPlugins();
});
