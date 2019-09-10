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

import { splitByEverything } from '../split_by_everything';
import { expect } from 'chai';
import sinon from 'sinon';

describe('splitByEverything(req, panel, series)', () => {
  let panel;
  let series;
  let req;
  beforeEach(() => {
    panel = {};
    series = { id: 'test', split_mode: 'everything' };
    req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    splitByEverything(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
  });

  it('returns a valid filter with match_all', () => {
    const next = doc => doc;
    const doc = splitByEverything(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          filter: {
            match_all: {},
          },
        },
      },
    });
  });

  it('calls next and does not add a filter', () => {
    series.split_mode = 'terms';
    series.terms_field = 'host';
    const next = sinon.spy(doc => doc);
    const doc = splitByEverything(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
    expect(doc).to.eql({});
  });
});
