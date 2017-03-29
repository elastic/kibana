const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe(filename, () => {

  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js')();
  });

  it('sets the color, on all series', () => {
    return invoke(fn, [seriesList, '#eee']).then((r) => {
      const colors = _.map(r.output.list, 'color');
      _.each(colors, (color) => expect(color).to.equal('#eee'));
    });
  });

  it('generates a gradient', () => {
    const expected = ['#000000', '#111111', '#222222', '#333333'];
    const fourLongList = {
      type: 'seriesList',
      list: seriesList.list.slice(0,4)
    };
    return invoke(fn, [fourLongList, '#000:#333']).then((r) => {
      const colors = _.map(r.output.list, 'color');
      _.each(colors, (color, i) => expect(color).to.equal(expected[i]));
    });
  });

  it('throws if you pass more colors than series', () => {
    invoke(fn, [seriesList, '#000:#111:#222:#333']).catch((e) => {
      expect(e).to.be.an(Error);
    });
  });

  it('throws if you do not pass a color', () => {
    invoke(fn, [seriesList, '']).catch((e) => {
      expect(e).to.be.an(Error);
    });
  });

});
