var filename = require('path').basename(__filename);
var fn = require(`../${filename}`);

var _ = require('lodash');
var expect = require('chai').expect;
var invoke = require('./helpers/invoke_series_fn.js');

describe(filename, () => {

  var seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js');
  });

  it('sets the color, on all series', () => {
    return invoke(fn, [seriesList, '#eee']).then((r) => {
      var colors = _.map(r.output.list, 'color');
      _.each(colors, (color) => expect(color).to.equal('#eee'));
    });
  });

});
