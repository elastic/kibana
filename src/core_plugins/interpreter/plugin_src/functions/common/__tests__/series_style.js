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

import expect from 'expect.js';
import { seriesStyle } from '../series_style';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('seriesStyle', () => {
  const fn = functionWrapper(seriesStyle);

  it('returns a seriesStyle', () => {
    const result = fn(null);
    expect(result).to.have.property('type', 'seriesStyle');
  });

  describe('args', () => {
    describe('label', () => {
      it('sets label to identify which series to style', () => {
        const result = fn(null, { label: 'kibana' });
        expect(result).to.have.property('label', 'kibana');
      });
    });

    describe('color', () => {
      it('sets color', () => {
        const result = fn(null, { color: 'purple' });
        expect(result).to.have.property('color', 'purple');
      });
    });

    describe('lines', () => {
      it('sets line width', () => {
        const result = fn(null, { lines: 1 });
        expect(result).to.have.property('lines', 1);
      });
    });

    describe('bars', () => {
      it('sets bar width', () => {
        const result = fn(null, { bars: 3 });
        expect(result).to.have.property('bars', 3);
      });
    });

    describe('points', () => {
      it('sets point size', () => {
        const result = fn(null, { points: 2 });
        expect(result).to.have.property('points', 2);
      });
    });

    describe('fill', () => {
      it('sets if series is filled', () => {
        let result = fn(null, { fill: true });
        expect(result).to.have.property('fill', true);

        result = fn(null, { fill: false });
        expect(result).to.have.property('fill', false);
      });
    });

    describe('stack', () => {
      it('sets stack id to stack multiple series with a shared id', () => {
        const result = fn(null, { stack: 1 });
        expect(result).to.have.property('stack', 1);
      });
    });

    describe('horizontalBars', () => {
      it('sets orientation of the series to horizontal', () => {
        const result = fn(null, { horizontalBars: true });
        expect(result).to.have.property('horizontalBars', true);
      });
      it('sets orientation of the series to vertical', () => {
        const result = fn(null, { horizontalBars: false });
        expect(result).to.have.property('horizontalBars', false);
      });
    });
  });
});
