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

import { parseInterval } from '../parse_interval';
import expect from '@kbn/expect';

describe('parseInterval', function () {
  it('should correctly parse an interval containing unit and value', function () {
    let duration = parseInterval('1d');
    expect(duration.as('d')).to.be(1);

    duration = parseInterval('2y');
    expect(duration.as('y')).to.be(2);

    duration = parseInterval('5M');
    expect(duration.as('M')).to.be(5);

    duration = parseInterval('5m');
    expect(duration.as('m')).to.be(5);

    duration = parseInterval('250ms');
    expect(duration.as('ms')).to.be(250);

    duration = parseInterval('100s');
    expect(duration.as('s')).to.be(100);

    duration = parseInterval('23d');
    expect(duration.as('d')).to.be(23);

    duration = parseInterval('52w');
    expect(duration.as('w')).to.be(52);
  });

  it('should correctly parse fractional intervals containing unit and value', function () {
    let duration = parseInterval('1.5w');
    expect(duration.as('w')).to.be(1.5);

    duration = parseInterval('2.35y');
    expect(duration.as('y')).to.be(2.35);
  });

  it('should correctly bubble up intervals which are less than 1', function () {
    let duration = parseInterval('0.5y');
    expect(duration.as('d')).to.be(183);

    duration = parseInterval('0.5d');
    expect(duration.as('h')).to.be(12);
  });

  it('should correctly parse a unit in an interval only', function () {
    let duration = parseInterval('ms');
    expect(duration.as('ms')).to.be(1);

    duration = parseInterval('d');
    expect(duration.as('d')).to.be(1);

    duration = parseInterval('m');
    expect(duration.as('m')).to.be(1);

    duration = parseInterval('y');
    expect(duration.as('y')).to.be(1);

    duration = parseInterval('M');
    expect(duration.as('M')).to.be(1);
  });

  it('should return null for an invalid interval', function () {
    let duration = parseInterval('');
    expect(duration).to.not.be.ok();

    duration = parseInterval(null);
    expect(duration).to.not.be.ok();

    duration = parseInterval('234asdf');
    expect(duration).to.not.be.ok();
  });
});
