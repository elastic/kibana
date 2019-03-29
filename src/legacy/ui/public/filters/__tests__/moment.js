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
import sinon from 'sinon';
import moment from 'moment';
import ngMock from 'ng_mock';
import '../moment';


let filter;
const anchor = '2014-01-01T06:06:06.666';

const init = function () {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('moment');
  });
};


describe('moment formatting filter', function () {
  const sandbox = sinon.createSandbox();

  beforeEach(function () {
    sandbox.useFakeTimers(moment(anchor).valueOf());

    init();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should have a moment filter', function () {
    expect(filter).to.not.be(null);
  });

  // MMMM Do YYYY, HH:mm:ss.SSS
  it('should format moments', function () {
    expect(filter(moment())).to.be('Jan 1, 2014 @ 06:06:06.666');
  });

  it('should format dates', function () {
    expect(filter(new Date())).to.be('Jan 1, 2014 @ 06:06:06.666');
  });

  it('should return the original value if passed anything other than a moment or Date', function () {
    expect(filter('beer')).to.be('beer');
    expect(filter(1)).to.be(1);
    expect(filter([])).to.eql([]);
  });
});
