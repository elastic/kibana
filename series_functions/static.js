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
          label: 'static'
        }
      ]
    });
  }
});
