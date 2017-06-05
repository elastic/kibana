const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);

const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe(filename, () => {

  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js')();
  });

  it('should create the _global object if it does not exist', () => {
    expect(seriesList.list[0]._global).to.equal(undefined);
    return invoke(fn, [seriesList, 'nw', 3]).then((r) => {
      expect(r.output.list[0]._global).to.eql({ legend:{ noColumns: 3, position: 'nw' } });
    });
  });

  it('should hide the legend is position is false', () => {
    return invoke(fn, [seriesList, false]).then((r) => {
      expect(r.output.list[0]._global.legend.show).to.equal(false);
    });
  });

});
