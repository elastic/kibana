/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './lines';

const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn';

describe('lines.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('should simply set show, steps, stack and lineWidth', () => {
    expect(seriesList.list[0]._global).to.equal(undefined);
    return invoke(fn, [seriesList, 1, 2, true, true, false]).then((r) => {
      expect(r.output.list[0].lines.lineWidth).to.equal(1);
      expect(r.output.list[0].lines.show).to.equal(true);
      expect(r.output.list[0].stack).to.equal(true);
      expect(r.output.list[0].lines.steps).to.equal(false);
    });
  });

  it('should set lineWidth to 3 by default, and nothing else', () => {
    expect(seriesList.list[0]._global).to.equal(undefined);
    return invoke(fn, [seriesList]).then((r) => {
      expect(r.output.list[0].lines.lineWidth).to.equal(3);
      expect(r.output.list[0].lines.fill).to.equal(undefined);
      expect(r.output.list[0].lines.show).to.equal(undefined);
      expect(r.output.list[0].stack).to.equal(undefined);
      expect(r.output.list[0].lines.steps).to.equal(undefined);
    });
  });
});
