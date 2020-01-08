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
import _ from 'lodash';
import { visTypes } from '../../visualizations/vis_types';

describe('Vislib Vis Types Test Suite', function() {
  let visFunc;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function() {
      visFunc = visTypes.point_series;
    })
  );

  it('should be an object', function() {
    expect(_.isObject(visTypes)).to.be(true);
  });

  it('should return a function', function() {
    expect(typeof visFunc).to.be('function');
  });
});
