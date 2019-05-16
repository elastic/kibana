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

import { expect } from 'chai';
import tickFormatter from '../tick_formatter';

describe('tickFormatter(format, template)', () => {

  it('returns a number with two decimal place by default', () => {
    const fn = tickFormatter();
    expect(fn(1.5556)).to.equal('1.56');
  });

  it('returns a percent with percent formatter', () => {
    const config = {
      'format:percent:defaultPattern': '0.[00]%'
    };
    const fn = tickFormatter('percent', null, (key) => config[key]);
    expect(fn(0.5556)).to.equal('55.56%');
  });

  it('returns a byte formatted string with byte formatter', () => {
    const config = {
      'format:bytes:defaultPattern': '0.0b'
    };
    const fn = tickFormatter('bytes', null, (key) => config[key]);
    expect(fn(1500 ^ 10)).to.equal('1.5KB');
  });

  it('returns a custom formatted string with custom formatter', () => {
    const fn = tickFormatter('0.0a');
    expect(fn(1500)).to.equal('1.5k');
  });

  it('returns a located string with custom locale setting', () => {
    const config = {
      'format:number:defaultLocale': 'fr'
    };
    const fn = tickFormatter('0,0.0', null, (key) => config[key]);
    expect(fn(1500)).to.equal('1 500,0');
  });

  it('returns a custom formatted string with custom formatter and template', () => {
    const fn = tickFormatter('0.0a', '{{value}}/s');
    expect(fn(1500)).to.equal('1.5k/s');
  });

  it('returns value if passed a bad formatter', () => {
    const fn = tickFormatter('102');
    expect(fn(100)).to.equal('100');
  });

  it('returns formatted value if passed a bad template', () => {
    const config = {
      'format:number:defaultPattern': '0,0.[00]'
    };
    const fn = tickFormatter('number', '{{value', (key) => config[key]);
    expect(fn(1.5556)).to.equal('1.56');
  });
});
