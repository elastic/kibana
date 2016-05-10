const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);

const _ = require('lodash');
const expect = require('chai').expect;
const invoke = require('./helpers/invoke_series_fn.js');

describe(filename, () => {
  it('returns a series in which all numbers are the same', () => {
    return invoke(fn, [5]).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([5, 5, 5, 5]);
    });
  });
});
