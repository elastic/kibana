/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './subtract';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn';

describe('subtract.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('it throws an error if first argument is not seriesList', async () => {
    const notSeriesList = [1, 2, 3, 4];
    try {
      await invoke(fn, [notSeriesList]);
      expect.fail();
    } catch (e) {
      expect(e.message).to.eql('input must be a seriesList');
    }
  });

  it('it subtracts all series in seriesList to single series when only one argument is supplied', async () => {
    const outputSeries = await invoke(fn, [seriesList]);
    expect(outputSeries.output.list.length).to.eql(1);
    expect(_.map(outputSeries.output.list[0].data, 1)).to.eql([
      -165.1415926535, -136, 19.561, -2.3424234999999998,
    ]);
  });

  it('it subtracts a number', async () => {
    const outputSeries = await invoke(fn, [seriesList, 2]);
    expect(_.map(outputSeries.output.list[1].data, 1)).to.eql([98, 48, 48, 18]);
  });

  it('it subtracts an array of numbers', async () => {
    const outputSeries = await invoke(fn, [seriesList, [5, 10, 15]]);
    expect(_.map(outputSeries.output.list[1].data, 1)).to.eql([70, 20, 20, -10]);
  });

  it('it subtracts a seriesList with one series', async () => {
    const seriesListWithOneSeries = {
      type: 'seriesList',
      list: [_.cloneDeep(seriesList.list[1])],
    };
    const outputSeries = await invoke(fn, [seriesList, seriesListWithOneSeries]);
    expect(_.map(outputSeries.output.list[1].data, 1)).to.eql([0, 0, 0, 0]);
  });

  it('it subtracts a seriesList with multiple series', async () => {
    const outputSeries = await invoke(fn, [seriesList, seriesList]);
    expect(_.map(outputSeries.output.list[0].data, 1)).to.eql([0, 0, 0, 0]);
    expect(_.map(outputSeries.output.list[1].data, 1)).to.eql([0, 0, 0, 0]);
    expect(_.map(outputSeries.output.list[2].data, 1)).to.eql([0, 0, 0, 0]);
    expect(_.map(outputSeries.output.list[3].data, 1)).to.eql([0, 0, 0, 0]);
    expect(_.map(outputSeries.output.list[4].data, 1)).to.eql([0, 0, 0, 0]);
  });
});
