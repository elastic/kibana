import { System } from './system';
import { KibanaSystem } from './system_types';

test('can get exposed values after starting', () => {
  type CoreType = { bar: string };
  type DepsType = { quux: string };
  type ExposedType = {
    core: CoreType;
    deps: DepsType;
  };

  class FooSystem extends KibanaSystem<CoreType, DepsType, ExposedType> {
    start() {
      return {
        core: this.kibana,
        deps: this.deps,
      };
    }
  }

  const system = new System('foo', {
    implementation: FooSystem,
  });

  system.start(
    {
      bar: 'bar',
    },
    {
      quux: 'quux',
    }
  );

  expect(system.getExposedValues()).toEqual({
    core: { bar: 'bar' },
    deps: { quux: 'quux' },
  });
});

test('throws if start returns a promise', () => {
  class FooSystem extends KibanaSystem<any, any, any> {
    async start() {
      return 'foo';
    }
  }

  const system = new System('foo', {
    implementation: FooSystem,
  });

  expect(() => {
    system.start({}, {});
  }).toThrowErrorMatchingSnapshot();
});

test('throws if stop returns a promise', () => {
  class FooSystem extends KibanaSystem<any, any, any> {
    start() {}

    async stop() {
      return 'stop';
    }
  }

  const system = new System('foo', {
    implementation: FooSystem,
  });

  system.start({}, {});

  expect(() => {
    system.stop();
  }).toThrowErrorMatchingSnapshot();
});
