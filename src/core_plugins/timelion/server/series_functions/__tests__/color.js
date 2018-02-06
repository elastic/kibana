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
      list: seriesList.list.slice(0, 4)
    };
    return invoke(fn, [fourLongList, '#000:#333']).then((r) => {
      const colors = _.map(r.output.list, 'color');
      _.each(colors, (color, i) => expect(color).to.equal(expected[i]));
    });
  });

  it('should handle more colors than number of series', async () => {
    const colorsArg = '#000:#111:#222:#333:#444:#555';
    const numColors = colorsArg.split(':').length;
    expect(numColors).to.be.above(seriesList.list.length);

    const r = await invoke(fn, [seriesList, colorsArg]);
    const seriesColors = _.map(r.output.list, 'color');
    expect(seriesColors).to.eql(['#000000', '#111111', '#222222', '#333333', '#444444']);
  });

  it('throws if you do not pass a color', () => {
    invoke(fn, [seriesList, '']).catch((e) => {
      expect(e).to.be.an(Error);
    });
  });

});
