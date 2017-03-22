const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);

const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe(filename, () => {

  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js')();
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
