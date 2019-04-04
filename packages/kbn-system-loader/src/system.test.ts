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
