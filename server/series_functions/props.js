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
    //console.log(args.byName);
    return alter(args, function (eachSeries) {
      var properties = _.omit(args.byName, 'inputSeries');
      _.assign(eachSeries, unflatten(properties));
      console.log(eachSeries);
      return eachSeries;
    });
  }
});
