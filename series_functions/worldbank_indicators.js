var _ = require('lodash');
var fetch = require('node-fetch');
var moment = require('moment');
var worldbank = require('./worldbank.js');
var Promise = require('bluebird');

module.exports = {
  dataSource: true,
  args: [
    {
      name: 'country', // countries/all/indicators/SP.POP.TOTL
      types: ['string']
    },
    {
      name: 'indicator',
      types: ['string']
    }
  ],
  aliases: ['wbi'],
  help: 'Pull data from http://data.worldbank.org/ using path to series.',
  fn: function worldbankIndicators(args, tlConfig) {
    var config = {
      country: args[0] || 'usa',
      indicator: args[1] || 'SP.POP.TOTL'
    };

    var countries = config.country.split(':');
    var seriesLists = _.map(countries, function (country) {
      return worldbank.fn(['countries/' + country + '/indicators/' + config.indicator], tlConfig);
    });

    return Promise.map(seriesLists, function (seriesList) {
      return seriesList.list[0];
    }).then(function (list) {
      return {
        type: 'seriesList',
        list: list
      };
    });

  }
};