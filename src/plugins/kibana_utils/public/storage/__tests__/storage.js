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

import sinon from 'sinon';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import '..';

let storage;
let $window;
const payload = { first: 'john', last: 'smith' };

function init() {
  ngMock.module('kibana/storage', function($provide) {
    // mock $window.localStorage for storage
    $provide.value('$window', {
      localStorage: {
        getItem: sinon.stub(),
        setItem: sinon.spy(),
        removeItem: sinon.spy(),
        clear: sinon.spy(),
      },
    });
  });

  ngMock.inject(function($injector) {
    storage = $injector.get('localStorage');
    $window = $injector.get('$window');
  });
}

describe('StorageService', function() {
  beforeEach(function() {
    init();
  });

  describe('expected API', function() {
    it('should have expected methods', function() {
      expect(storage.get).to.be.a('function');
      expect(storage.set).to.be.a('function');
      expect(storage.remove).to.be.a('function');
      expect(storage.clear).to.be.a('function');
    });
  });

  describe('call behavior', function() {
    it('should call getItem on the store', function() {
      storage.get('name');

      expect($window.localStorage.getItem.callCount).to.equal(1);
    });

    it('should call setItem on the store', function() {
      storage.set('name', 'john smith');

      expect($window.localStorage.setItem.callCount).to.equal(1);
    });

    it('should call removeItem on the store', function() {
      storage.remove('name');

      expect($window.localStorage.removeItem.callCount).to.equal(1);
    });

    it('should call clear on the store', function() {
      storage.clear();

      expect($window.localStorage.clear.callCount).to.equal(1);
    });
  });

  describe('json data', function() {
    it('should parse JSON when reading from the store', function() {
      const getItem = $window.localStorage.getItem;
      getItem.returns(JSON.stringify(payload));

      const data = storage.get('name');
      expect(data).to.eql(payload);
    });

    it('should write JSON string to the store', function() {
      const setItem = $window.localStorage.setItem;
      const key = 'name';
      const value = payload;

      storage.set(key, value);

      const call = setItem.getCall(0);
      expect(call.args[0]).to.equal(key);
      expect(call.args[1]).to.equal(JSON.stringify(value));
    });
  });

  describe('expected responses', function() {
    it('should return null when not exists', function() {
      const data = storage.get('notexists');
      expect(data).to.equal(null);
    });

    it('should return null when invalid JSON', function() {
      const getItem = $window.localStorage.getItem;
      getItem.returns('not: json');

      const data = storage.get('name');
      expect(data).to.equal(null);
    });
  });
});
