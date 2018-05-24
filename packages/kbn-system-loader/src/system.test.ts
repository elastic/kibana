/* tslint:disable max-classes-per-file */

import { System } from './system';
import { KibanaSystem } from './system_types';

test('can get exposed values after starting', () => {
  interface ICoreType {
    bar: string;
  }
  interface IDepsType {
    quux: string;
  }
  interface IExposedType {
    core: ICoreType;
    deps: IDepsType;
  }

  class FooSystem extends KibanaSystem<ICoreType, IDepsType, IExposedType> {
    public start() {
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
    public async start() {
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
    public start() {
      // noop
    }

    public async stop() {
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
