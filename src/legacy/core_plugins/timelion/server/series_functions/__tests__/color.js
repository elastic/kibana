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

const fn = require(`../color`);

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe('color.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js')();
  });

  it('sets the color, on all series', () => {
    return invoke(fn, [seriesList, '#eee']).then(r => {
      const colors = _.map(r.output.list, 'color');
      _.each(colors, color => expect(color).to.equal('#eee'));
    });
  });

  it('generates a gradient', () => {
    const expected = ['#000000', '#111111', '#222222', '#333333'];
    const fourLongList = {
      type: 'seriesList',
      list: seriesList.list.slice(0, 4),
    };
    return invoke(fn, [fourLongList, '#000:#333']).then(r => {
      const colors = _.map(r.output.list, 'color');
      _.each(colors, (color, i) => expect(color).to.equal(expected[i]));
    });
  });

  it('should handle more colors than number of series', async () => {
    const colorsArg = '#000:#111:#222:#333:#444:#555';
    const numColors = colorsArg.split(':').length;
    expect(numColors).to.be.above(seriesList.list.length);

    const r = await invoke(fn, [seriesList, colorsArg]);
    const seriesColors = _.map(r.output.list, 'color');
    expect(seriesColors).to.eql(['#000000', '#111111', '#222222', '#333333', '#444444']);
  });

  it('should work with series.length=1 and more colors', async () => {
    const oneLongList = {
      type: 'seriesList',
      list: seriesList.list.slice(0, 1),
    };
    const colorsArg = '#000:#111';

    const r = await invoke(fn, [oneLongList, colorsArg]);
    const seriesColors = _.map(r.output.list, 'color');
    expect(seriesColors).to.eql(['#000']);
  });

  it('throws if you do not pass a color', () => {
    invoke(fn, [seriesList, '']).catch(e => {
      expect(e).to.be.an(Error);
    });
  });
});
