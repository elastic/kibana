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

import expect from '@kbn/expect';
import ngMock from 'ng_mock';

describe('Private module loader', function () {
  let Private;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function ($injector) {
      Private = $injector.get('Private');
    })
  );

  it('accepts a provider that will be called to init a module', function () {
    const football = {};
    function Provider() {
      return football;
    }

    const instance = Private(Provider);
    expect(instance).to.be(football);
  });

  it('injects angular dependencies into the Provider', function () {
    function Provider(Private) {
      return Private;
    }

    const instance = Private(Provider);
    expect(instance).to.be(Private);
  });

  it('detects circular dependencies', function () {
    expect(function () {
      function Provider1() {
        Private(Provider2);
      }

      function Provider2() {
        Private(Provider1);
      }

      Private(Provider1);
    }).to.throwException(/circular/i);
  });

  it('always provides the same instance form the Provider', function () {
    function Provider() {
      return {};
    }

    expect(Private(Provider)).to.be(Private(Provider));
  });

  describe('#stub', function () {
    it('accepts a replacement instance for a Provider', function () {
      const replaced = {};
      const replacement = {};

      function Provider() {
        return replaced;
      }

      const instance = Private(Provider);
      expect(instance).to.be(replaced);

      Private.stub(Provider, replacement);

      const instance2 = Private(Provider);
      expect(instance2).to.be(replacement);

      Private.stub(Provider, replaced);

      const instance3 = Private(Provider);
      expect(instance3).to.be(replaced);
    });
  });

  describe('#swap', function () {
    it('accepts a new Provider that should replace an existing Provider', function () {
      function Provider1() {
        return {};
      }

      function Provider2() {
        return {};
      }

      const instance1 = Private(Provider1);
      expect(instance1).to.be.an('object');

      Private.swap(Provider1, Provider2);

      const instance2 = Private(Provider1);
      expect(instance2).to.be.an('object');
      expect(instance2).to.not.be(instance1);

      Private.swap(Provider1, Provider1);

      const instance3 = Private(Provider1);
      expect(instance3).to.be(instance1);
    });

    it('gives the new Provider access to the Provider it replaced via an injectable dependency called $decorate', function () {
      function Provider1() {
        return {};
      }

      function Provider2($decorate) {
        return {
          instance1: $decorate(),
        };
      }

      const instance1 = Private(Provider1);
      expect(instance1).to.be.an('object');

      Private.swap(Provider1, Provider2);

      const instance2 = Private(Provider1);
      expect(instance2).to.have.property('instance1');
      expect(instance2.instance1).to.be(instance1);
    });
  });
});
