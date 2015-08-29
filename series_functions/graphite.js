var _ = require('lodash');
var fetch = require('node-fetch');
var moment = require('moment');
var Datasource = require('../lib/classes/datasource');


module.exports = new Datasource ('graphite', {
  args: [
    {
      name: 'metric', // _test-data.users.*.data
      types: ['string']
    }
  ],
  help: 'Pull data grahite',
  fn: function graphite(args, tlConfig) {
    // http://api.worldbank.org/en/countries/ind;chn/indicators/DPANUSSPF?date=2000:2006&MRV=5

    var config = {
      metric: args[0]
    };

    var time = {
      min: moment(tlConfig.time.from).format('HH:mm[_]YYYYMMDD'),
      max:  moment(tlConfig.time.to).format('HH:mm[_]YYYYMMDD')
    };

    var URL = tlConfig.file.graphite.url + '/render/' +
      '?format=json' +
      '&from=' + time.min +
      '&until=' + time.max +
      '&target=' + config.metric;

    return fetch(URL).then(function (resp) { return resp.json(); }).then(function (resp) {
      var list = _.map(resp, function (series) {
        var data = _.map(series.datapoints, function (point) {
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