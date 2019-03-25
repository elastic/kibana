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
import _ from 'lodash';
import ngMock from 'ng_mock';
import 'plugins/kibana/discover/index';
import '../field_type';

let filter;

let types;

const init = function () {
  // Load the application
  ngMock.module('kibana');

  types = [
    { name: 's1', type: 'string' },
    { name: 's2', type: 'string' },
    { name: 's3', type: 'string' },

    { name: 'n1', type: 'number' },
    { name: 'n2', type: 'number' },

    { name: 'i1', type: 'ip' },
    { name: 'd1', type: 'date' },
  ];

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('fieldType');
  });
};


describe('fieldType array filter', function () {

  beforeEach(function () {
    init();
  });

  it('should have a fieldType filter', function () {
    expect(filter).to.not.be(null);
  });

  it('should have 3 string fields', function () {
    expect(filter(types, 'string').length).to.be(3);
  });

  it('should have 2 number fields', function () {
    expect(filter(types, 'number').length).to.be(2);
  });

  it('should have 1 ip field and 1 date field', function () {
    expect(_.pluck(filter(types, ['date', 'ip']), 'name')).to.eql(['i1', 'd1']);
  });

  it('should return all fields when passed *', function () {
    expect(filter(types, '*').length).to.be(7);
  });

  it('should allow negation', function () {
    const resultNames = _.pluck(filter(types, '!string'), 'name');
    expect(resultNames).to.eql(['n1', 'n2', 'i1', 'd1']);
  });
});
