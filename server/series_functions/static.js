var _ = require('lodash');
var fetch = require('node-fetch');
var moment = require('moment');
var Datasource = require('../lib/classes/datasource');
var Promise = require('bluebird');


module.exports = new Datasource ('static', {
  aliases: ['value'],
  args: [
    {
      name: 'value', // _test-data.users.*.data
      types: ['number'],
      help: 'The single vale to to display'
    },
    {
      name: 'label',
      types: ['string'],
      help: 'A quick way to set the label for the series. You could also use the .label() function'
    }
  ],
  help: 'Draws a single value across the chart',
  fn: function staticFn(args, tlConfig) {

    var data = _.map(tlConfig.getTargetSeries(), function (bucket) {
      return [bucket[0], args.byName.value];
    });

    return Promise.resolve({
      type: 'seriesList',
      list: [
        {
          data: data,
          type: 'series',
          label: args.byName.label == null ? String(args.byName.value) : args.byName.label
        }
      ]
    });
  }
});
