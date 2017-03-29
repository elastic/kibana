import alter from '../lib/alter.js';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('hide', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'hide',
      types: ['boolean', 'null'],
      help: 'Hide or unhide the series'
    }
  ],
  help: 'Hide the series by default',
  fn: function hideFn(args) {
    return alter(args, function (eachSeries, hide) {
      eachSeries._hide = hide == null ? true : hide;
      return eachSeries;
    });
  }
});
