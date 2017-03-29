import alter from '../lib/alter.js';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('label', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'label',
      types: ['string'],
      help: 'Legend value for series. You can use $1, $2, etc, in the string to match up with the regex capture groups'
    },
    {
      name: 'regex',
      types: ['string', 'null'],
      help: 'A regex with capture group support'
    }
  ],
  help: 'Change the label of the series. Use %s reference the existing label',
  fn:  function labelFn(args) {
    const config = args.byName;
    return alter(args, function (eachSeries) {
      if (config.regex) {
        eachSeries.label = eachSeries.label.replace(new RegExp(config.regex), config.label);
      } else {
        eachSeries.label = config.label;
      }

      return eachSeries;
    });
  }
});
