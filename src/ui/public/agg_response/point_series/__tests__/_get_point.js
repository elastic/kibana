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

import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { PointSeriesGetPointProvider } from '../_get_point';

describe('getPoint', function () {

  let getPoint;

  const truthFormatted = { fieldFormatter: _.constant(_.constant(true)) };
  const identFormatted = { fieldFormatter: _.constant(_.identity) };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    getPoint = Private(PointSeriesGetPointProvider);
  }));

  describe('Without series aspect', function () {
    let seriesAspect;
    let xAspect;
    let yCol;
    let yAspect;
    let yScale;

    beforeEach(function () {
      seriesAspect = null;
      xAspect = { i: 0 };
      yCol = { title: 'Y', aggConfig: {} };
      yAspect = { i: 1, col: yCol };
      yScale = 5;
    });

    it('properly unwraps and scales values', function () {
      const row = [ { value: 1 }, { value: 2 }, { value: 3 } ];
      const zAspect = { i: 2 };
      const point = getPoint(xAspect, seriesAspect, yScale, row, yAspect, zAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('y', 10)
        .and.have.property('z', 3)
        .and.have.property('series', yCol.title)
        .and.have.property('aggConfigResult', row[1]);
    });

    it('ignores points with a y value of NaN', function () {
      const row = [ { value: 1 }, { value: 'NaN' }];
      const point = getPoint(xAspect, seriesAspect, yScale, row, yAspect);
      expect(point).to.be(void 0);
    });
  });

  describe('With series aspect', function () {
    let row;
    let xAspect;
    let yAspect;
    let yScale;

    beforeEach(function () {
      row = [ { value: 1 }, { value: 2 }, { value: 3 }];
      xAspect = { i: 0 };
      yAspect = { i: 2 };
      yScale = null;
    });

    it('properly unwraps and scales values', function () {
      const seriesAspect = { i: 1, agg: identFormatted };
      const point = getPoint(xAspect, seriesAspect, yScale, row, yAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('series', '2')
        .and.have.property('y', 3)
        .and.have.property('aggConfigResult', row[2]);
    });

    it('properly formats series values', function () {
      const seriesAspect = { i: 1, agg: truthFormatted };
      const point = getPoint(xAspect, seriesAspect, yScale, row, yAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('series', 'true')
        .and.have.property('y', 3)
        .and.have.property('aggConfigResult', row[2]);
    });

    it ('adds the aggConfig to the points', function () {
      const seriesAspect = { i: 1, agg: truthFormatted };
      const point = getPoint(xAspect, seriesAspect, yScale, row, yAspect);

      expect(point).to.have.property('aggConfig', truthFormatted);
    });
  });
});
