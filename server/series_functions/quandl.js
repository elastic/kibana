var _ = require('lodash');
var fetch = require('node-fetch');
var moment = require('moment');
fetch.Promise = require('bluebird');
//var parseDateMath = require('../utils/date_math.js');

var APIKEY = 'kBtiRZbjgezSQ5sy11Ns';

module.exports = {
  dataSource: true,
  args: [
    {
      name: 'code',
      types: ['string']
    },
    {
      name: 'position',
      types: ['number']
    }
  ],
  help: 'Pull data from quandl.com using the quandl code',
  aliases: ['elasticsearch'],
  fn: function quandlFn (args, tlConfig) {
    var config = {
      code: args[0] || 'WIKI/AAPL',
      position: args[1] || 1
    };

    var time = {
      min: moment(tlConfig.time.min).format('YYYY-MM-DD'),
      max:  moment(tlConfig.time.max).format('YYYY-MM-DD')
    };

    // POSITIONS
    // 1. open
    // 2. high
    // 3. low
    // 4. close
    // 5. volume

    var URL = 'https://www.quandl.com/api/v1/datasets/' + config.code + '.json'+
      '?sort_order=asc' +
      '&trim_start=' + time.min +
      '&trim_end=' + time.max +
      '&collapse=weekly' +
      '&auth_token=' + APIKEY;

    return fetch(URL).then(function (resp) {return resp.json();}).then(function (resp) {
      var data = _.map(resp.data, function (bucket) {
        return [moment(bucket[0]).valueOf(), bucket[config.position]];
      });

      return {
        type: 'seriesList',
        list: [{
          data:  data,
          type: 'series',
          //cacheKey: cacheKey,
          label: resp.name
        }]
      };
    }).catch(function (e) {
      throw e;
    });
  }
};