import _ from 'lodash';
import Datasource from '../lib/classes/datasource';
import Promise from 'bluebird';


module.exports = new Datasource ('static', {
  aliases: ['value'],
  args: [
    {
      name: 'value', // _test-data.users.*.data
      types: ['number', 'string'],
      help: 'The single value to to display, you can also pass several values and I will interpolate them evenly ' +
        'across your time range.'
    },
    {
      name: 'label',
      types: ['string', 'null'],
      help: 'A quick way to set the label for the series. You could also use the .label() function'
    }
  ],
  help: 'Draws a single value across the chart',
  fn: function staticFn(args, tlConfig) {

    let data;
    const target = tlConfig.getTargetSeries();
    if (typeof args.byName.value === 'string') {
      const points = args.byName.value.split(':');
      const begin = _.first(target)[0];
      const end = _.last(target)[0];
      const step = (end - begin) / (points.length - 1);
      data = _.map(points, function (point, i) {
        return [begin + (i * step), parseFloat(point)];
      });
    } else {
      data = _.map(target, function (bucket) {
        return [bucket[0], args.byName.value];
      });
    }

    return Promise.resolve({
      type: 'seriesList',
      list: [
        {
          data: data,
          type: 'series',
          label: args.byName.label == null ? String(args.byName.value) : args.byName.label,
          fit: args.byName.fit || 'average'
        }
      ]
    });
  }
});
