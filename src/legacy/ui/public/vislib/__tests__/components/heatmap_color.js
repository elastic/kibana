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
import { getHeatmapColors } from '../../components/color/heatmap_color';

describe('Vislib Heatmap Color Module Test Suite', function() {
  const emptyObject = {};
  const nullValue = null;
  let notAValue;

  beforeEach(ngMock.module('kibana'));

  it('should throw an error if schema is invalid', function() {
    expect(function() {
      getHeatmapColors(4, 'invalid schema');
    }).to.throwError();
  });

  it('should throw an error if input is not a number', function() {
    expect(function() {
      getHeatmapColors([200], 'Greens');
    }).to.throwError();

    expect(function() {
      getHeatmapColors('help', 'Greens');
    }).to.throwError();

    expect(function() {
      getHeatmapColors(true, 'Greens');
    }).to.throwError();

    expect(function() {
      getHeatmapColors(notAValue, 'Greens');
    }).to.throwError();

    expect(function() {
      getHeatmapColors(nullValue, 'Greens');
    }).to.throwError();

    expect(function() {
      getHeatmapColors(emptyObject, 'Greens');
    }).to.throwError();
  });

  it('should throw an error if input is less than 0', function() {
    expect(function() {
      getHeatmapColors(-2, 'Greens');
    }).to.throwError();
  });

  it('should throw an error if input is greater than 1', function() {
    expect(function() {
      getHeatmapColors(2, 'Greens');
    }).to.throwError();
  });

  it('should be a function', function() {
    expect(typeof getHeatmapColors).to.be('function');
  });

  it('should return a color for 10 numbers from 0 to 1', function() {
    const colorRegex = /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/;
    const schema = 'Greens';
    for (let i = 0; i < 10; i++) {
      expect(getHeatmapColors(i / 10, schema)).to.match(colorRegex);
    }
  });

  describe('drawColormap function', () => {
    it('should return canvas element', () => {
      const response = getHeatmapColors.prototype.drawColormap('Greens');
      expect(typeof response).to.equal('object');
      expect(response instanceof window.HTMLElement).to.equal(true);
    });
  });
});
