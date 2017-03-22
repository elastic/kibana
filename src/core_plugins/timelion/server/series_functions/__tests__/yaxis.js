const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);
import Promise from 'bluebird';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe(filename, () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js')();
  });

  it('creates the yaxes array', () => {
    expect(seriesList._global).to.equal(undefined);
    return invoke(fn, [seriesList, 2]).then((r) => {
      expect(r.output.list[0]._global.yaxes).to.be.an('array');
    });
  });

  it('puts odd numbers of the left, even on the right, by default', () => {
    return Promise.all([
      invoke(fn, [seriesList, 1]).then((r) => {
        expect(r.output.list[0]._global.yaxes[0].position).to.equal('left');
      }),
      invoke(fn, [seriesList, 2]).then((r) => {
        expect(r.output.list[0]._global.yaxes[1].position).to.equal('right');
      }),
      invoke(fn, [seriesList, 3]).then((r) => {
        expect(r.output.list[0]._global.yaxes[2].position).to.equal('left');
      }),
    ]);
  });

  it('it lets you override default positions', () => {
    return Promise.all([
      invoke(fn, [seriesList, 1, null, null, 'right']).then((r) => {
        expect(r.output.list[0]._global.yaxes[0].position).to.equal('right');
      }),
      invoke(fn, [seriesList, 2, null, null, 'right']).then((r) => {
        expect(r.output.list[0]._global.yaxes[1].position).to.equal('right');
      }),
    ]);
  });

  it('sets the minimum (default: no min)', () => {
    return Promise.all([
      invoke(fn, [seriesList, 1, null]).then((r) => {
        expect(r.output.list[0]._global.yaxes[0].min).to.equal(null);
      }),
      invoke(fn, [seriesList, 2, 10]).then((r) => {
        expect(r.output.list[0]._global.yaxes[1].min).to.equal(10);
      }),
    ]);
  });

  it('sets the max (default: no max)', () => {
    return Promise.all([
      invoke(fn, [seriesList, 1, null]).then((r) => {
        expect(r.output.list[0]._global.yaxes[0].max).to.equal(undefined);
      }),
      invoke(fn, [seriesList, 2, null, 10]).then((r) => {
        expect(r.output.list[0]._global.yaxes[1].max).to.equal(10);
      }),
    ]);
  });

  it('sets the units (default: no unit', () => {
    return Promise.all([
      invoke(fn, [seriesList, 1, null, null, null, null, null, null]).then((r) => {
        expect(r.output.list[0]._global.yaxes[0].units).to.equal(undefined);
      }),
      invoke(fn, [seriesList, 2, null, null, null, null, null, 'bits']).then((r) => {
        expect(r.output.list[0]._global.yaxes[1].units).to.be.an('object');
      }),
    ]);
  });

  it('throws an error if currency is not three letter code', () => {
    invoke(fn, [seriesList, 1, null, null, null, null, null, 'currency:abcde']).catch(e => {
      expect(e).to.be.an(Error);
    });
    invoke(fn, [seriesList, 1, null, null, null, null, null, 'currency:12']).catch(e => {
      expect(e).to.be.an(Error);
    });
    invoke(fn, [seriesList, 1, null, null, null, null, null, 'currency:$#']).catch(e => {
      expect(e).to.be.an(Error);
    });
    invoke(fn, [seriesList, 1, null, null, null, null, null, 'currency:ab']).catch(e => {
      expect(e).to.be.an(Error);
    });
  });

});
