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

import { uiRegistry } from '../_registry';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';

describe('Registry', function () {
  let Private;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function ($injector) {
      Private = $injector.get('Private');
    })
  );

  it('is technically a function', function () {
    const reg = uiRegistry();
    expect(reg).to.be.a('function');
  });

  describe('#register', function () {
    it('accepts a Private module', function () {
      const reg = uiRegistry();
      const mod = function SomePrivateModule() {};

      reg.register(mod);
      // modules are not exposed, so this is the most that we can test
    });

    it('applies the filter function if one is specified', function () {
      const reg = uiRegistry({
        filter: (item) => item.value % 2 === 0, // register only even numbers
      });

      reg.register(() => ({ value: 17 }));
      reg.register(() => ({ value: 18 })); // only this one should get registered
      reg.register(() => ({ value: 19 }));

      const modules = Private(reg);
      expect(modules).to.have.length(1);
      expect(modules[0].value).to.be(18);
    });
  });

  describe('as a module', function () {
    it('exposes the list of registered modules', function () {
      const reg = uiRegistry();
      const mod = function SomePrivateModule(Private) {
        this.PrivateModuleLoader = Private;
      };

      reg.register(mod);
      const modules = Private(reg);
      expect(modules).to.have.length(1);
      expect(modules[0]).to.have.property('PrivateModuleLoader', Private);
    });
  });

  describe('spec', function () {
    it('executes with the module list as "this", and can override it', function () {
      let self;

      const reg = uiRegistry({
        constructor: function () {
          return { mods: (self = this) };
        },
      });

      const modules = Private(reg);
      expect(modules).to.be.an('object');
      expect(modules).to.have.property('mods', self);
    });
  });

  describe('spec.name', function () {
    it('sets the displayName of the registry and the name param on the final instance', function () {
      const reg = uiRegistry({
        name: 'visTypes',
      });

      expect(reg).to.have.property('displayName', '[registry visTypes]');
      expect(Private(reg)).to.have.property('name', 'visTypes');
    });
  });

  describe('spec.constructor', function () {
    it('executes before the modules are returned', function () {
      let i = 0;

      const reg = uiRegistry({
        constructor: function () {
          i = i + 1;
        },
      });

      Private(reg);
      expect(i).to.be(1);
    });

    it('executes with the module list as "this", and can override it', function () {
      let self;

      const reg = uiRegistry({
        constructor: function () {
          return { mods: (self = this) };
        },
      });

      const modules = Private(reg);
      expect(modules).to.be.an('object');
      expect(modules).to.have.property('mods', self);
    });
  });

  describe('spec.invokeProviders', () => {
    it('is called with the registered providers and defines the initial set of values in the registry', () => {
      const reg = uiRegistry({
        invokeProviders(providers) {
          return providers.map((i) => i * 1000);
        },
      });

      reg.register(1);
      reg.register(2);
      reg.register(3);
      expect(Private(reg).toJSON()).to.eql([1000, 2000, 3000]);
    });
    it('does not get assigned as a property of the registry', () => {
      expect(
        uiRegistry({
          invokeProviders() {},
        })
      ).to.not.have.property('invokeProviders');
    });
  });

  describe('spec[any]', function () {
    it('mixes the extra properties into the module list', function () {
      const reg = uiRegistry({
        someMethod: function () {
          return this;
        },
      });

      const modules = Private(reg);
      expect(modules).to.have.property('someMethod');
      expect(modules.someMethod()).to.be(modules);
    });
  });
});
