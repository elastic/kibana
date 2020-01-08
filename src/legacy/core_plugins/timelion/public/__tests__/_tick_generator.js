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
import { generateTicksProvider } from '../panels/timechart/tick_generator';

describe('Tick Generator', function() {
  let generateTicks;

  beforeEach(function() {
    generateTicks = generateTicksProvider();
  });

  describe('generateTicksProvider()', function() {
    it('should return a function', function() {
      expect(generateTicks).to.be.a('function');
    });
  });

  describe('generateTicks()', function() {
    const axes = [
      {
        min: 0,
        max: 5000,
        delta: 100,
      },
      {
        min: 0,
        max: 50000,
        delta: 2000,
      },
      {
        min: 4096,
        max: 6000,
        delta: 250,
      },
    ];

    axes.forEach(axis => {
      it(`generates ticks from ${axis.min} to ${axis.max}`, function() {
        const ticks = generateTicks(axis);
        let n = 1;
        while (Math.pow(2, n) < axis.delta) n++;
        const expectedDelta = Math.pow(2, n);
        const expectedNr = parseInt((axis.max - axis.min) / expectedDelta) + 2;
        expect(ticks instanceof Array).to.be(true);
        expect(ticks.length).to.be(expectedNr);
        expect(ticks[0]).to.equal(axis.min);
        expect(ticks[parseInt(ticks.length / 2)]).to.equal(
          axis.min + expectedDelta * parseInt(ticks.length / 2)
        );
        expect(ticks[ticks.length - 1]).to.equal(axis.min + expectedDelta * (ticks.length - 1));
      });
    });
  });
});
