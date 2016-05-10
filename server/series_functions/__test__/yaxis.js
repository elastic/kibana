const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);
const Promise = require('bluebird');

const _ = require('lodash');
const expect = require('chai').expect;
const invoke = require('./helpers/invoke_series_fn.js');

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

  it('sets the minimum (default: 0)', () => {
    return Promise.all([
      invoke(fn, [seriesList, 1, null]).then((r) => {
        expect(r.output.list[0]._global.yaxes[0].min).to.equal(0);
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

});
