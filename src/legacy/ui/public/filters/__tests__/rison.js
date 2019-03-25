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
import 'plugins/kibana/discover/index';

// Load kibana and its applications

let rison;
let risonDecode;

const init = function () {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($filter) {
    rison = $filter('rison');
    risonDecode = $filter('risonDecode');
  });
};

describe('rison filters', function () {
  const testObj = {
    time: {
      from: 'now-15m',
      to: 'now'
    }
  };
  const testRison = '(time:(from:now-15m,to:now))';

  beforeEach(function () {
    init();
  });

  describe('rison', function () {
    it('should have the filter', function () {
      expect(rison).to.not.be(null);
    });

    it('should rison encode data', function () {
      expect(rison(testObj)).to.be(testRison);
    });
  });

  describe('risonDecode', function () {
    it('should have the filter', function () {
      expect(risonDecode).to.not.be(null);
    });

    it('should decode rison data', function () {
      expect(risonDecode(testRison)).to.eql(testObj);
    });
  });
});
