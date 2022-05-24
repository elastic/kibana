/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './legend';

const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn';

describe('legend.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('should create the _global object if it does not exist', () => {
    expect(seriesList.list[0]._global).to.equal(undefined);
    return invoke(fn, [seriesList, 'nw', 3, true, 'YYYY']).then((r) => {
      expect(r.output.list[0]._global).to.eql({
        legend: { noColumns: 3, position: 'nw', showTime: true, timeFormat: 'YYYY' },
      });
    });
  });

  it('should provide default values for time axis display', () => {
    return invoke(fn, [seriesList, 'nw', 3]).then((r) => {
      expect(r.output.list[0]._global.legend.showTime).to.equal(true);
      expect(r.output.list[0]._global.legend.timeFormat).to.equal('MMMM Do YYYY, HH:mm:ss.SSS');
    });
  });

  it('should hide the legend is position is false', () => {
    return invoke(fn, [seriesList, false]).then((r) => {
      expect(r.output.list[0]._global.legend.show).to.equal(false);
      expect(r.output.list[0]._global.legend.showTime).to.equal(false);
    });
  });

  it('should set legend.showTime to false when showTime parameter is false', () => {
    return invoke(fn, [seriesList, 'nw', 3, false]).then((r) => {
      expect(r.output.list[0]._global.legend.showTime).to.equal(false);
    });
  });
});
