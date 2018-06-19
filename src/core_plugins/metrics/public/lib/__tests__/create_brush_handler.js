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

import createBrushHandler from '../create_brush_handler';
import moment from 'moment';
import { expect } from 'chai';

describe('createBrushHandler', () => {
  let timefilter;
  let fn;
  let range;

  beforeEach(() => {
    timefilter = { time: {}, update: () => {} };
    fn = createBrushHandler(timefilter);
    range = { xaxis: { from: '2017-01-01T00:00:00Z', to: '2017-01-01T00:10:00Z' } };
    fn(range);
  });

  it('returns brushHandler() that updates timefilter', () => {
    expect(timefilter.time.from).to.equal(moment(range.xaxis.from).toISOString());
    expect(timefilter.time.to).to.equal(moment(range.xaxis.to).toISOString());
    expect(timefilter.time.mode).to.equal('absolute');
  });

});
