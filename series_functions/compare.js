var alter = require('../lib/alter.js');
var _ = require('lodash');
var Chainable = require('../lib/classes/chainable');
var argType = require('../handlers/lib/arg_type.js');

module.exports = new Chainable('compare', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'operator', // <, <=, >, >=, ==, !=
      types: ['string'],
      help: 'Operator to use for comparison, valid operators are eq (equal), ne (not equal), lt (less than), lte ' +
        '(less than equal), gt (greater than), gte (greater than equal)'
    },
    {
      name: 'value',
      types: ['number', 'seriesList', 'null'],
      help: 'The value to which the point will be compared. If you pass a seriesList here the first series will be used'
    },
    {
      name: 'result',
      types: ['number', 'seriesList', 'null'],
      help: 'The value the point will be set to if the comparison is true. If you pass a seriesList here the first series will be used'
    }
  ],
  help: 'Compares each point to a number, or the same point in another series using an operator, then sets its value' +
    'to the result if the condition proves true. You can use this to see if 2 series are equal at any or all points',
  fn: function absFn(args) {
    var config = args.byName;
    return alter(args, function (eachSeries) {
      var data = _.map(eachSeries.data, function (point, i) {
        var newValue;

        function getNumber(source) {
          if (argType(source) === 'number') return source;
          if (argType(source) === 'null') return null;
          if (argType(source) === 'seriesList') return source.list[0].data[i][1];
          throw new Error ('must be a number or a seriesList');
        }

        var value = getNumber(config.value);
        var result = getNumber(config.result);

        var newValue = (function () {
          switch (config.operator) {
            case 'lt':
              return point[1] < value ? result : point[1];
            case 'lte':
              return point[1] <= value ? result : point[1];
            case 'gt':
              return point[1] > value ? result : point[1];
            case 'gte':
              return point[1] >= value ? result : point[1];
            case 'eq':
              return point[1] === value ? result : point[1];
            case 'ne':
              return point[1] !== value ? result : point[1];
            default:
              throw new Error ('Unknown operator');
          }
        }());

        return [point[0], newValue];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  }
});
