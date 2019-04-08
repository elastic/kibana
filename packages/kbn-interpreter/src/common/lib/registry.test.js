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

import { Registry } from './registry';

function validateRegistry(registry, elements) {
  it('gets items by lookup property', () => {
    expect(registry.get('__test2')).toEqual(elements[1]());
  });

  it('ignores case when getting items', () => {
    expect(registry.get('__TeSt2')).toEqual(elements[1]());
    expect(registry.get('__tESt2')).toEqual(elements[1]());
  });

  it('gets a shallow clone', () => {
    expect(registry.get('__test2')).not.toBe(elements[1]());
  });

  it('is null with no match', () => {
    expect(registry.get('@@nope_nope')).toBe(null);
  });

  it('returns shallow clone of the whole registry via toJS', () => {
    const regAsJs = registry.toJS();
    expect(regAsJs).toEqual({
      __test1: elements[0](),
      __test2: elements[1](),
    });
    expect(regAsJs.__test1).toEqual(elements[0]());
    expect(regAsJs.__test1).not.toBe(elements[0]());
  });

  it('returns shallow clone array via toArray', () => {
    const regAsArray = registry.toArray();
    expect(regAsArray).toBeInstanceOf(Array);
    expect(regAsArray[0]).toEqual(elements[0]());
    expect(regAsArray[0]).not.toBe(elements[0]());
  });

  it('resets the registry', () => {
    expect(registry.get('__test2')).toEqual(elements[1]());
    registry.reset();
    expect(registry.get('__test2')).toBe(null);
  });
}

describe('Registry', () => {
  describe('name registry', () => {
    const elements = [
      () => ({
        name: '__test1',
        prop1: 'some value',
      }),
      () => ({
        name: '__test2',
        prop2: 'some other value',
        type: 'unused',
      }),
    ];

    const registry = new Registry();
    registry.register(elements[0]);
    registry.register(elements[1]);

    validateRegistry(registry, elements);

    it('has a prop of name', () => {
      expect(registry.getProp()).toBe('name');
    });

    it('throws when object is missing the lookup prop', () => {
      const check = () => registry.register(() => ({ hello: 'world' }));
      expect(check).toThrowError(/object with a name property/);
    });
  });

  describe('type registry', () => {
    const elements = [
      () => ({
        type: '__test1',
        prop1: 'some value',
      }),
      () => ({
        type: '__test2',
        prop2: 'some other value',
        name: 'unused',
      }),
    ];

    const registry = new Registry('type');
    registry.register(elements[0]);
    registry.register(elements[1]);

    validateRegistry(registry, elements);

    it('has a prop of type', () => {
      expect(registry.getProp()).toBe('type');
    });

    it('throws when object is missing the lookup prop', () => {
      const check = () => registry.register(() => ({ hello: 'world' }));
      expect(check).toThrowError(/object with a type property/);
    });
  });

  describe('wrapped registry', () => {
    let idx = 0;
    const elements = [
      () => ({
        name: '__test1',
        prop1: 'some value',
      }),
      () => ({
        name: '__test2',
        prop2: 'some other value',
        type: 'unused',
      }),
    ];

    class CustomRegistry extends Registry {
      wrapper(obj) {
        // append custom prop to shallow cloned object, with index as a value
        return {
          ...obj,
          __CUSTOM_PROP__: (idx += 1),
        };
      }
    }

    const registry = new CustomRegistry();
    registry.register(elements[0]);
    registry.register(elements[1]);

    it('contains wrapped elements', () => {
      expect(registry.get(elements[0]().name)).toHaveProperty('__CUSTOM_PROP__');
      expect(registry.get(elements[1]().name)).toHaveProperty('__CUSTOM_PROP__');
    });
  });

  describe('shallow clone full prototype', () => {
    const name = 'test_thing';
    let registry;
    let thing;

    beforeEach(() => {
      registry = new Registry();
      class Base {
        constructor(name) {
          this.name = name;
        }

        baseFunc() {
          return 'base';
        }
      }

      class Thing extends Base {
        doThing() {
          return 'done';
        }
      }

      thing = () => new Thing(name);
      registry.register(thing);
    });

    it('get contains the full prototype', () => {
      expect(typeof thing().baseFunc).toBe('function');
      expect(typeof registry.get(name).baseFunc).toBe('function');
    });

    it('toJS contains the full prototype', () => {
      const val = registry.toJS();
      expect(typeof val[name].baseFunc).toBe('function');
    });
  });

  describe('throws when lookup prop is not a string', () => {
    const check = () => new Registry(2);
    expect(check).toThrowError(/must be a string/);
  });
});
