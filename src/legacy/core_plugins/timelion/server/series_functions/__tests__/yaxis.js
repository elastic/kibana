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

const fn = require(`../yaxis`);
import Bluebird from 'bluebird';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe('yaxis.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js')();
  });

  it('creates the yaxes array', () => {
    expect(seriesList._global).to.equal(undefined);
    return invoke(fn, [seriesList, 2]).then(r => {
      expect(r.output.list[0]._global.yaxes).to.be.an('array');
    });
  });

  it('puts odd numbers of the left, even on the right, by default', () => {
    return Bluebird.all([
      invoke(fn, [seriesList, 1]).then(r => {
        expect(r.output.list[0]._global.yaxes[0].position).to.equal('left');
      }),
      invoke(fn, [seriesList, 2]).then(r => {
        expect(r.output.list[0]._global.yaxes[1].position).to.equal('right');
      }),
      invoke(fn, [seriesList, 3]).then(r => {
        expect(r.output.list[0]._global.yaxes[2].position).to.equal('left');
      }),
    ]);
  });

  it('it lets you override default positions', () => {
    return Bluebird.all([
      invoke(fn, [seriesList, 1, null, null, 'right']).then(r => {
        expect(r.output.list[0]._global.yaxes[0].position).to.equal('right');
      }),
      invoke(fn, [seriesList, 2, null, null, 'right']).then(r => {
        expect(r.output.list[0]._global.yaxes[1].position).to.equal('right');
      }),
    ]);
  });

  it('sets the minimum (default: no min)', () => {
    return Bluebird.all([
      invoke(fn, [seriesList, 1, null]).then(r => {
        expect(r.output.list[0]._global.yaxes[0].min).to.equal(null);
      }),
      invoke(fn, [seriesList, 2, 10]).then(r => {
        expect(r.output.list[0]._global.yaxes[1].min).to.equal(10);
      }),
    ]);
  });

  it('sets the max (default: no max)', () => {
    return Bluebird.all([
      invoke(fn, [seriesList, 1, null]).then(r => {
        expect(r.output.list[0]._global.yaxes[0].max).to.equal(undefined);
      }),
      invoke(fn, [seriesList, 2, null, 10]).then(r => {
        expect(r.output.list[0]._global.yaxes[1].max).to.equal(10);
      }),
    ]);
  });

  it('sets the units (default: no unit', () => {
    return Bluebird.all([
      invoke(fn, [seriesList, 1, null, null, null, null, null, null]).then(r => {
        expect(r.output.list[0]._global.yaxes[0].units).to.equal(undefined);
      }),
      invoke(fn, [seriesList, 2, null, null, null, null, null, 'bits']).then(r => {
        expect(r.output.list[0]._global.yaxes[1].units).to.be.an('object');
      }),
    ]);
  });

  it('throws an error if currency is not three letter code', () => {
    invoke(fn, [seriesList, 1, null, null, null, null, null, 'currency:abcde']).catch(e => {
      expect(e).to.be.an(Error);
    });
    invoke(fn, [seriesList, 1, null, null, null, null, null, 'currency:12']).catch(e => {
      expect(e).to.be.an(Error);
    });
    invoke(fn, [seriesList, 1, null, null, null, null, null, 'currency:$#']).catch(e => {
      expect(e).to.be.an(Error);
    });
    invoke(fn, [seriesList, 1, null, null, null, null, null, 'currency:ab']).catch(e => {
      expect(e).to.be.an(Error);
    });
  });
});
