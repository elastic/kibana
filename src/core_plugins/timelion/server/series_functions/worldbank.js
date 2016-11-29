var _ = require('lodash');
var fetch = require('node-fetch');
var moment = require('moment');
var Datasource = require('../lib/classes/datasource');

module.exports = new Datasource ('worldbank', {
  args: [
    {
      name: 'code', // countries/all/indicators/SP.POP.TOTL
      types: ['string', 'null'],
      help: 'Worldbank API path.' +
        ' This is usually everything after the domain, before the querystring. Eg: ' +
        '/en/countries/ind;chn/indicators/DPANUSSPF.'
    }
  ],
  aliases: ['wb'],
  help: `
    [experimental]
    Pull data from http://data.worldbank.org/ using path to series.
    The worldbank provides mostly yearly data, and often has no data for the current year.
    Try offset=-1y if you get no data for recent time ranges.`,
  fn: function worldbank(args, tlConfig) {
    // http://api.worldbank.org/en/countries/ind;chn/indicators/DPANUSSPF?date=2000:2006&MRV=5

    var config = _.defaults(args.byName, {
      code: 'countries/wld/indicators/SP.POP.TOTL'
    });

    var time = {
      min: moment(tlConfig.time.from).format('YYYY'),
      max:  moment(tlConfig.time.to).format('YYYY')
    };

    var URL = 'http://api.worldbank.org/' + config.code +
      '?date=' + time.min + ':' + time.max +
      '&format=json' +
      '&per_page=1000';

    return fetch(URL).then(function (resp) { return resp.json(); }).then(function (resp) {
      var hasData = false;

      var respSeries = resp[1];

      var deduped = {};
      var description;
      _.each (respSeries, function (bucket) {
        if (bucket.value != null) hasData = true;
        description = bucket.country.value + ' ' + bucket.indicator.value;
        deduped[bucket.date] = bucket.value;
      });

      var data = _.compact(_.map(deduped, function (val, date) {
        // Discard nulls
        if (val == null) return;
        return [moment(date, 'YYYY').valueOf(), Number(val)];
      }));

      if (!hasData) throw new Error('Worldbank request succeeded, but there was no data for ' + config.code);

      return {
        type: 'seriesList',
        list: [{
          data:  data,
          type: 'series',
          label: description,
          _meta: {
            worldbank_request: URL
          }
        }]
      };
    }).catch(function (e) {
      throw e;
    });
  }
});
