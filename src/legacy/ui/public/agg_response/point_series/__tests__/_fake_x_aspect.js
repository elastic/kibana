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
import { makeFakeXAspect } from '../_fake_x_aspect';

describe('makeFakeXAspect', function () {

  it('creates an object that looks like an aspect', function () {
    const aspect = makeFakeXAspect();

    expect(aspect)
      .to.have.property('accessor', -1)
      .and.have.property('title', 'All docs')
      .and.have.property('format')
      .and.have.property('params');

    expect(aspect.params).to.have.property('defaultValue', '_all');
  });
});
