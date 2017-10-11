jest.mock('../KibanaPluginValues', () => {
  return {
    createKibanaValuesForPlugin: () => ({})
  };
});

import { Plugin } from '../Plugin';
import { PluginSystem } from '../PluginSystem';
import { KibanaCoreModules } from '../KibanaCoreModules';
import { logger } from '../../../logging/__mocks__';

// To make typings work in the tests
const coreValues = {} as KibanaCoreModules;

test('can register value', () => {
  expect.assertions(1);

  type Foo = {
    foo: {
      value: string;
    };
  };

  const foo = new Plugin<{}, Foo['foo']>(
    'foo',
    {
      dependencies: [],
      plugin: config => {
        return {
          value: 'my-value'
        };
      }
    },
    logger
  );

  const bar = new Plugin<Foo, void>(
    'bar',
    {
      dependencies: ['foo'],
      plugin: (kibana, deps) => {
        expect(deps.foo).toEqual({ value: 'my-value' });
      }
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);
  plugins.addPlugin(foo);
  plugins.addPlugin(bar);
  plugins.startPlugins();
});

test('can register function', () => {
  expect.assertions(2);

  type Foo = {
    foo: {
      fn: (val: string) => string;
    };
  };

  const foo = new Plugin<{}, Foo['foo']>(
    'foo',
    {
      dependencies: [],
      plugin: config => ({
        fn: val => `test-${val}`
      })
    },
    logger
  );

  const bar = new Plugin<Foo, void>(
    'bar',
    {
      dependencies: ['foo'],
      plugin: (kibana, deps) => {
        expect(deps.foo).toBeDefined();
        expect(deps.foo.fn('some-value')).toBe('test-some-value');
      }
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);
  plugins.addPlugin(foo);
  plugins.addPlugin(bar);
  plugins.startPlugins();
});

test('can register value with same name across plugins', () => {
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

  const foo = new Plugin<{}, Foo['foo']>(
    'foo',
    {
      dependencies: [],
      plugin: kibana => ({
        value: 'value-foo'
      })
    },
    logger
  );

  const bar = new Plugin<{}, Bar['bar']>(
    'bar',
    {
      dependencies: [],
      plugin: kibana => ({
        value: 'value-bar'
      })
    },
    logger
  );

  const quux = new Plugin<Foo & Bar, void>(
    'quux',
    {
      dependencies: ['foo', 'bar'],
      plugin: (kibana, deps) => {
        expect(deps.foo).toEqual({ value: 'value-foo' });
        expect(deps.bar).toEqual({ value: 'value-bar' });
      }
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);
  plugins.addPlugin(foo);
  plugins.addPlugin(bar);
  plugins.addPlugin(quux);
  plugins.startPlugins();
});

test('receives values from dependencies but not transitive dependencies', () => {
  expect.assertions(3);

  type Grandchild = {
    grandchild: {
      value: string;
    };
  };

  const grandchild = new Plugin<{}, Grandchild['grandchild']>(
    'grandchild',
    {
      dependencies: [],
      plugin: kibana => ({
        value: 'grandchild'
      })
    },
    logger
  );

  type Child = {
    child: {
      value: string;
    };
  };

  const child = new Plugin<Grandchild, Child['child']>(
    'child',
    {
      dependencies: ['grandchild'],
      plugin: (kibana, deps) => {
        expect(deps.grandchild).toEqual({ value: 'grandchild' });

        return {
          value: 'child'
        };
      }
    },
    logger
  );

  const parent = new Plugin<Grandchild & Child, void>(
    'parent',
    {
      dependencies: ['child'],
      plugin: (kibana, deps) => {
        expect(deps.child).toEqual({ value: 'child' });
        expect(deps.grandchild).toBeUndefined();
      }
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);
  plugins.addPlugin(grandchild);
  plugins.addPlugin(child);
  plugins.addPlugin(parent);
  plugins.startPlugins();
});

test('keeps ref on registered value', () => {
  expect.assertions(1);

  type Child = {
    child: {
      value: {};
    };
  };

  const myRef = {};

  const child = new Plugin<{}, Child['child']>(
    'child',
    {
      dependencies: [],
      plugin: kibana => ({
        value: myRef
      })
    },
    logger
  );

  const parent = new Plugin<Child, void>(
    'parent',
    {
      dependencies: ['child'],
      plugin: (kibana, deps) => {
        expect(deps.child.value).toBe(myRef);
      }
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);
  plugins.addPlugin(child);
  plugins.addPlugin(parent);
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

  const child = new Plugin<{}, Child['child']>(
    'child',
    {
      dependencies: [],
      plugin: kibana => ({
        value1: 1,
        value2: 2
      })
    },
    logger
  );

  const parent = new Plugin<Child, void>(
    'parent',
    {
      dependencies: ['child'],
      plugin: (kibana, deps) => {
        expect(deps.child).toEqual({
          value1: 1,
          value2: 2
        });
      }
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);
  plugins.addPlugin(child);
  plugins.addPlugin(parent);
  plugins.startPlugins();
});

test('plugins can be typed', () => {
  expect.assertions(5);

  type Foo = {
    foo: {
      value1: number;
      value2: number;
    };
  };

  const foo = new Plugin<{}, Foo['foo']>(
    'foo',
    {
      dependencies: [],
      plugin: kibana => ({
        value1: 1,
        value2: 2
      })
    },
    logger
  );

  type Bar = {
    bar: {
      value1: string;
      value2: boolean;
    };
  };

  const bar = new Plugin<Foo, Bar['bar']>(
    'bar',
    {
      dependencies: ['foo'],
      plugin: (kibana, deps) => {
        expect(deps.foo.value1).toBe(1);

        return {
          value1: 'test',
          value2: false
        };
      }
    },
    logger
  );

  const quux = new Plugin<Foo & Bar, void>(
    'quux',
    {
      dependencies: ['foo', 'bar'],
      plugin: (kibana, deps) => {
        expect(deps.foo.value1).toBe(1);
        expect(deps.foo.value2).toBe(2);

        expect(deps.bar.value1).toBe('test');
        expect(deps.bar.value2).toBe(false);
      }
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);
  plugins.addPlugin(foo);
  plugins.addPlugin(bar);
  plugins.addPlugin(quux);
  plugins.startPlugins();
});

test('ensure `this` is not specified when starting a plugin', () => {
  expect.assertions(1);

  const foo = new Plugin<{}, void>(
    'foo',
    {
      dependencies: [],
      plugin: function(this: any, config) {
        expect(this).toBeNull();
      }
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);
  plugins.addPlugin(foo);
  plugins.startPlugins();
});

test("throws if starting a plugin that depends on a plugin that's not yet started", () => {
  const foo = new Plugin<{}, void>(
    'foo',
    {
      dependencies: ['does-not-exist'],
      plugin: () => {}
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);

  plugins.addPlugin(foo);

  expect(() => {
    plugins.startPlugins();
  }).toThrowErrorMatchingSnapshot();
});

test("throws if adding a plugin that's already added", () => {
  const foo = new Plugin<{}, void>(
    'foo',
    {
      dependencies: [],
      plugin: () => {}
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);

  plugins.addPlugin(foo);
  expect(() => {
    plugins.addPlugin(foo);
  }).toThrowErrorMatchingSnapshot();
});

test('stops plugins in reverse order of started order', () => {
  const events: string[] = [];

  class FooPlugin {
    start() {
      events.push('start foo');
    }
    stop() {
      events.push('stop foo');
    }
  }

  class BarPlugin {
    start() {
      events.push('start bar');
    }
    stop() {
      events.push('stop bar');
    }
  }

  const foo = new Plugin<{}, void>(
    'foo',
    {
      dependencies: [],
      plugin: FooPlugin
    },
    logger
  );
  const bar = new Plugin<{}, void>(
    'bar',
    {
      dependencies: [],
      plugin: BarPlugin
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);

  plugins.addPlugin(foo);
  plugins.addPlugin(bar);

  plugins.startPlugins();
  plugins.stopPlugins();

  expect(events).toEqual(['start bar', 'start foo', 'stop foo', 'stop bar']);
});

test('can add plugins before adding its dependencies', () => {
  expect.assertions(1);

  type Foo = {
    foo: string;
  };

  const foo = new Plugin<{}, Foo['foo']>(
    'foo',
    {
      dependencies: [],
      plugin: kibana => 'value'
    },
    logger
  );

  const bar = new Plugin<Foo, void>(
    'bar',
    {
      dependencies: ['foo'],
      plugin: (kibana, deps) => {
        expect(deps.foo).toBe('value');
      }
    },
    logger
  );

  const plugins = new PluginSystem(coreValues, logger);
  // `bar` depends on `foo`, but we add it first
  plugins.addPlugin(bar);
  plugins.addPlugin(foo);
  plugins.startPlugins();
});
