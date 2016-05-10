const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);

const _ = require('lodash');
const expect = require('chai').expect;
const invoke = require('./helpers/invoke_series_fn.js');

describe(filename, () => {

  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js')();
  });

  it('Can multiply to transform one interval to another', () => {
    return invoke(fn, [seriesList, '1ms']).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([-0.051, 0.017, 0.082, 0.02]);
    });
  });
});
