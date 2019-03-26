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
import '../start_from';


let filter;

const init = function () {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('startFrom');
  });
};

describe('startFrom array filter', function () {

  beforeEach(function () {
    init();
  });

  it('should have a startFrom filter', function () {
    expect(filter).to.not.be(null);
  });

  it('should return an empty array if passed undefined', function () {
    expect(filter(undefined, 10)).to.eql([]);
  });

  it('should return an array with the first 3 elements removed', function () {
    expect(filter([1, 2, 3, 4, 5, 6, 7, 8, 9], 3).length).to.be(6);
  });

});
