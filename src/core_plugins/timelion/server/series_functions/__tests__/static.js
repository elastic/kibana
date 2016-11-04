const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe(filename, () => {
  it('returns a series in which all numbers are the same', () => {
    return invoke(fn, [5]).then((r) => {
      expect(_.unique(_.map(r.output.list[0].data, 1))).to.eql([5]);
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
