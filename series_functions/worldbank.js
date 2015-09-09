var _ = require('lodash');
var fetch = require('node-fetch');
var moment = require('moment');
var Datasource = require('../lib/classes/datasource');

module.exports = new Datasource ('worldbank', {
  args: [
    {
      name: 'code', // countries/all/indicators/SP.POP.TOTL
      types: ['string']
    }
  ],
  aliases: ['wb'],
  help: 'Pull data from http://data.worldbank.org/ using path to series.',
  fn: function worldbank(args, tlConfig) {
    // http://api.worldbank.org/en/countries/ind;chn/indicators/DPANUSSPF?date=2000:2006&MRV=5

    var config = {
      code: args[0] || 'countries/all/indicators/SP.POP.TOTL'
    };

    var time = {
      min: moment(tlConfig.time.from).format('YYYY'),
      max:  moment(tlConfig.time.to).format('YYYY')
    };

    var URL = 'http://api.worldbank.org/' + config.code +
      '?date=' + time.min + ':' + time.max +
      '&format=json' +
      '&per_page=1000';

    return fetch(URL).then(function (resp) { return resp.json(); }).then(function (resp) {
      var respSeries = resp[1];

      var deduped = {};
      var description;
      _.each (respSeries, function (bucket) {
        description = bucket.country.value + ' ' + bucket.indicator.value;
        deduped[bucket.date] = bucket.value;
      });

      var data = _.map(deduped, function (val, date) {
        return [moment(date, 'YYYY').valueOf(), parseInt(val, 10)];
      });

      return {
        type: 'seriesList',
        list: [{
          data:  data,
          type: 'series',
          fit: 'nearest',
          label: description
        }]
      };
    }).catch(function (e) {
      throw e;
    });
  }
});