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

const fn = require(`src/plugins/timelion/server/series_functions/subtract`);

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe('subtract.js', () => {

  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js')();
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
    expect(_.map(outputSeries.output.list[0].data, 1)).to.eql([-165.1415926535, -136, 19.561, -2.3424234999999998]);
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
      list: [
        _.cloneDeep(seriesList.list[1])
      ]
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
