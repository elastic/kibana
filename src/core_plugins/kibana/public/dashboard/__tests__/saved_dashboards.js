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

import ngMock from 'ng_mock';
import expect from 'expect.js';

describe('SavedDashboards Service', function () {
  let savedDashboardLoader;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (savedDashboards) {
    savedDashboardLoader = savedDashboards;
  }));

  it('delete returns a native promise', function () {
    expect(savedDashboardLoader.delete(['1', '2'])).to.be.a(Promise);
  });
});
