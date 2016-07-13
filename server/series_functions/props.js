var alter = require('../lib/alter.js');
var Chainable = require('../lib/classes/chainable');
var _ = require('lodash');

function unflatten(data) {
  if (Object(data) !== data || _.isArray(data)) return data;

  var regex = new RegExp(/\.?([^.\[\]]+)|\[(\d+)\]/g);
  var result = {};
  _.each(data, function (val, p) {
    var cur = result;
    var prop = '';
    var m;
    while (m = regex.exec(p)) {
      cur = cur[prop] || (cur[prop] = (m[2] ? [] : {}));
      prop = m[2] || m[1];
    }
    cur[prop] = data[p];
  });

  return result[''] || result;
};

module.exports = new Chainable('props', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'global',
      types: ['boolean', 'null'],
      help: 'Set props on the seriesList vs on each series'
    }
  ],
  extended: {
    types: ['seriesList', 'number', 'string', 'boolean', 'null'],
    // Extended args can not currently be multivalued,
    // multi: false is not required and is shown here for demonstration purposes
    multi: false
  },
  // extended means you can pass arguments that aren't listed. They just won't be in the ordered array
  // They will be passed as args._extended:{}
  help: 'Use at your own risk, sets arbitrary properties on the series. For example .props(label=bears!)',
  fn: function firstFn(args) {
    var properties = unflatten(_.omit(args.byName, 'inputSeries', 'global'));

    if (args.byName.global) {
      _.assign(args.byName.inputSeries, properties);
      return args.byName.inputSeries;
    } else {
      return alter(args, function (eachSeries) {
        _.assign(eachSeries, properties);
        return eachSeries;
      });
    }
  }
});
