import alter from '../lib/alter.js';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('title', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'title',
      types: ['string', 'null'],
      help: 'Title for the plot.'
    }
  ],
  help: 'Adds a title to the top of the plot. If called on more than 1 seriesList the last call will be used.',
  fn: function hideFn(args) {
    return alter(args, function (eachSeries, title) {
      eachSeries._title = title;
      return eachSeries;
    });
  }
});
