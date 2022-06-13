/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './color';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn';

describe('color.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('sets the color, on all series', () => {
    return invoke(fn, [seriesList, '#eee']).then((r) => {
      const colors = _.map(r.output.list, 'color');
      _.each(colors, (color) => expect(color).to.equal('#eee'));
    });
  });

  it('generates a gradient', () => {
    const expected = ['#000000', '#111111', '#222222', '#333333'];
    const fourLongList = {
      type: 'seriesList',
      list: seriesList.list.slice(0, 4),
    };
    return invoke(fn, [fourLongList, '#000:#333']).then((r) => {
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
    invoke(fn, [seriesList, '']).catch((e) => {
      expect(e).to.be.an(Error);
    });
  });
});
