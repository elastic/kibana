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
import '../comma_list';

describe('Comma-List filter', function () {

  let commaList;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    commaList = $injector.get('commaListFilter');
  }));

  it('converts a string to a pretty list', function () {
    expect(commaList('john,jaine,jim', true)).to.be('john, jaine, and jim');
    expect(commaList('john,jaine,jim', false)).to.be('john, jaine, or jim');
  });

  it('can accept an array too', function () {
    expect(commaList(['john', 'jaine', 'jim'])).to.be('john, jaine, or jim');
  });

  it('handles undefined ok', function () {
    expect(commaList()).to.be('');
  });

  it('handles single values ok', function () {
    expect(commaList(['john'])).to.be('john');
  });

});
