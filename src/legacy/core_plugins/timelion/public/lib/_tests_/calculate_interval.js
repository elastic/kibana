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

const filename = require('path').basename(__filename);
const fn = require(`../calculate_interval`);
const moment = require('moment');
const expect = require('chai').expect;


const from = (count, unit) => moment().subtract(count, unit).valueOf();
const to = moment().valueOf();
const size = 200;
const min = '1ms';

describe(filename, () => {
  it('Exports a function', () => {
    expect(fn).to.be.a('function');
  });

  it('Only calculates when interval = auto', () => {
    const partialFn = (interval) => fn(from(1, 'y'), to, size, interval, min);
    expect(partialFn('1ms')).to.equal('1ms');
    expect(partialFn('bag_of_beans')).to.equal('bag_of_beans');
    expect(partialFn('auto')).to.not.equal('auto');
  });

  it('Calculates nice round intervals', () => {
    const partialFn = (count, unit) => fn(from(count, unit), to, size, 'auto', min);
    expect(partialFn(15, 'm')).to.equal('1s');
    expect(partialFn(1, 'h')).to.equal('30s');
    expect(partialFn(3, 'd')).to.equal('30m');
    expect(partialFn(1, 'w')).to.equal('1h');
    expect(partialFn(1, 'y')).to.equal('24h');
    expect(partialFn(100, 'y')).to.equal('1y');
  });

  it('Does not calculate an interval lower than the minimum', () => {
    const partialFn = (count, unit) => fn(from(count, unit), to, size, 'auto', '1m');
    expect(partialFn(5, 's')).to.equal('1m');
    expect(partialFn(15, 'm')).to.equal('1m');
    expect(partialFn(1, 'h')).to.equal('1m');
    expect(partialFn(3, 'd')).to.equal('30m');
    expect(partialFn(1, 'w')).to.equal('1h');
    expect(partialFn(1, 'y')).to.equal('24h');
    expect(partialFn(100, 'y')).to.equal('1y');
  });
});
