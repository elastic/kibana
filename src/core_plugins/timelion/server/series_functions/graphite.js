let _ = require('lodash');
let fetch = require('node-fetch');
let moment = require('moment');
let Datasource = require('../lib/classes/datasource');


module.exports = new Datasource ('graphite', {
  args: [
    {
      name: 'metric', // _test-data.users.*.data
      types: ['string'],
      help: 'Graphite metric to pull, eg _test-data.users.*.data'
    }
  ],
  help: `[experimental] Pull data from graphite. Configure your graphite server in Kibana's Advanced Settings`,
  fn: function graphite(args, tlConfig) {

    let config = args.byName;

    let time = {
      min: moment(tlConfig.time.from).format('HH:mm[_]YYYYMMDD'),
      max:  moment(tlConfig.time.to).format('HH:mm[_]YYYYMMDD')
    };

    let URL = tlConfig.settings['timelion:graphite.url'] + '/render/' +
      '?format=json' +
      '&from=' + time.min +
      '&until=' + time.max +
      '&target=' + config.metric;

    return fetch(URL).then(function (resp) {
      return resp.json();
    }).then(function (resp) {
      let list = _.map(resp, function (series) {
        let data = _.map(series.datapoints, function (point) {
          return [point[1] * 1000, point[0]];
        });
        return {
          data: data,
          type: 'series',
          fit: 'nearest', // TODO make this customizable
          label: series.target
        };
      });

      return {
        type: 'seriesList',
        list: list
      };
    }).catch(function (e) {
      throw e;
    });
  }
});
