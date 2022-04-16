/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './static';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn';

describe('static.js', () => {
  it('returns a series in which all numbers are the same', () => {
    return invoke(fn, [5]).then((r) => {
      expect(_.uniq(_.map(r.output.list[0].data, 1))).to.eql([5]);
    });
  });

  it('plots a provided series', () => {
    return invoke(fn, ['4:3:2:1']).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([4, 3, 2, 1]);
    });
  });

  it('leaves interpolation up to the data source wrapper', () => {
    return invoke(fn, ['1:4']).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([1, 4]);
    });
  });
});
