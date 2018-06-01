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

/* tslint:disable max-classes-per-file */

import { System } from './system';
import { KibanaSystemApiFactory, SystemLoader } from './system_loader';
import { KibanaSystem } from './system_types';

// To make types simpler in the tests
type CoreType = void;
const createCoreValues = () => {
  // noop
};

test('starts system with core api', () => {
  expect.assertions(1);

  interface IKibanaCoreApi {
    fromCore: boolean;
    name: string;
  }
  interface IMetadata {
    configPath?: string;
  }

  class FooSystem extends KibanaSystem<IKibanaCoreApi, {}> {
    public start() {
      expect(this.kibana).toEqual({
        fromCore: true,
        metadata: {
          configPath: 'config.path.foo',
        },
        name: 'foo',
      });
    }
  }

  const foo = new System('foo', {
    implementation: FooSystem,
    metadata: {
      configPath: 'config.path.foo',
    },
  });

  const createSystemApi: KibanaSystemApiFactory<IKibanaCoreApi, IMetadata> = (
    name,
    metadata
  ) => {
    return {
      fromCore: true,
      metadata,
      name,
    };
  };

  const systems = new SystemLoader(createSystemApi);
  systems.addSystem(foo);

  systems.startSystems();
});

test('system can expose a value', () => {
  expect.assertions(1);

  interface IFoo {
    foo: {
      value: string;
    };
  }

  class FooSystem extends KibanaSystem<CoreType, {}, IFoo['foo']> {
    public start() {
      return {
        value: 'my-value',
      };
    }
  }

  class BarSystem extends KibanaSystem<CoreType, IFoo> {
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

  interface IFoo {
    foo: {
      fn: (val: string) => string;
    };
  }

  class FooSystem extends KibanaSystem<CoreType, {}, IFoo['foo']> {
    public start(): IFoo['foo'] {
      return {
        fn: val => `test-${val}`,
      };
    }
  }

  class BarSystem extends KibanaSystem<CoreType, IFoo> {
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

  interface IFoo {
    foo: {
      value: string;
    };
  }

  interface IBar {
    bar: {
      value: string;
    };
  }

  class FooSystem extends KibanaSystem<CoreType, {}, IFoo['foo']> {
    public start(): IFoo['foo'] {
      return {
        value: 'value-foo',
      };
    }
  }

  class BarSystem extends KibanaSystem<CoreType, {}, IBar['bar']> {
    public start(): IBar['bar'] {
      return {
        value: 'value-bar',
      };
    }
  }

  class QuuxSystem extends KibanaSystem<CoreType, IFoo & IBar> {
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

  interface IGrandchild {
    grandchild: {
      value: string;
    };
  }

  interface IChild {
    child: {
      value: string;
    };
  }

  class GrandchildSystem extends KibanaSystem<
    CoreType,
    {},
    IGrandchild['grandchild']
  > {
    public start() {
      return {
        value: 'grandchild',
      };
    }
  }

  class ChildSystem extends KibanaSystem<
    CoreType,
    IGrandchild,
    IChild['child']
  > {
    public start() {
      expect(this.deps.grandchild).toEqual({ value: 'grandchild' });

      return {
        value: 'child',
      };
    }
  }

  class ParentSystem extends KibanaSystem<CoreType, IGrandchild & IChild> {
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

  interface IChild {
    child: {
      value: {};
    };
  }

  const myRef = {};

  class ChildSystem extends KibanaSystem<CoreType, {}, IChild['child']> {
    public start() {
      return {
        value: myRef,
      };
    }
  }

  class ParentSystem extends KibanaSystem<CoreType, IChild> {
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

  interface IChild {
    child: {
      value1: number;
      value2: number;
    };
  }

  class ChildSystem extends KibanaSystem<CoreType, {}, IChild['child']> {
    public start() {
      return {
        value1: 1,
        value2: 2,
      };
    }
  }

  class ParentSystem extends KibanaSystem<CoreType, IChild> {
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
    public start() {
      // noop
    }
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
    public start() {
      // noop
    }
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

  interface IFoo {
    foo: string;
  }

  class FooSystem extends KibanaSystem<CoreType, {}, IFoo['foo']> {
    public start() {
      return 'value';
    }
  }

  class BarSystem extends KibanaSystem<CoreType, IFoo> {
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
