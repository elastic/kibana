import _ from 'lodash';
import Chainable from '../../lib/classes/chainable';
import * as regress from './lib/regress';

const validRegressions = {
  linear: 'linear',
  log: 'logarithmic',
};

module.exports = new Chainable('trend', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'mode',
      types: ['string'],
      help: 'The algorithm to use for generating the trend line. One of: ' + _.keys(validRegressions).join(', ')
    },
    {
      name: 'start',
      types: ['number', 'null'],
      help: 'Where to start calculating from the beginning or end. For example -10 would start calculating 10 points from' +
      ' the end, +15 would start 15 points from the beginning. Default: 0',
    },
    {
      name: 'end',
      types: ['number', 'null'],
      help: 'Where to stop calculating from the beginning or end. For example -10 would stop calculating 10 points from' +
      ' the end, +15 would stop 15 points from the beginning. Default: 0',
    },
  ],
  help: 'Draws a trend line using a specified regression algorithm',
  fn: function absFn(args) {
    const newSeries = _.cloneDeep(args.byName.inputSeries);

    _.each(newSeries.list, function (series) {
      const length = series.data.length;
      let start = args.byName.start == null ? 0 : args.byName.start;
      let end = args.byName.end == null ? length : args.byName.end;
      start = start >= 0 ? start : length + start;
      end = end > 0 ? end : length + end;

      const subset = series.data.slice(start, end);

      const result = regress[args.byName.mode || 'linear'](subset);

      _.each(series.data, function (point) {
        point[1] = null;
      });

      _.each(result, function (point, i) {
        series.data[start + i] = point;
      });
    });
    return newSeries;
  }
});
