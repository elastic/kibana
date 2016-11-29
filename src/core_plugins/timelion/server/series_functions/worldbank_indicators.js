var _ = require('lodash');
var fetch = require('node-fetch');
var moment = require('moment');
var worldbank = require('./worldbank.js');
var Promise = require('bluebird');
var Datasource = require('../lib/classes/datasource');


module.exports = new Datasource ('worldbank_indicators', {
  args: [
    {
      name: 'country', // countries/all/indicators/SP.POP.TOTL
      types: ['string', 'null'],
      help: 'Worldbank country identifier. Usually the country\'s 2 letter code'
    },
    {
      name: 'indicator',
      types: ['string', 'null'],
      help: 'The indicator code to use. You\'ll have to look this up on data.worldbank.org.' +
        ' Often pretty obtuse. Eg SP.POP.TOTL is population'
    }
  ],
  aliases: ['wbi'],
  help: `
    [experimental]
    Pull data from http://data.worldbank.org/ using the country name and indicator. The worldbank provides
    mostly yearly data, and often has no data for the current year. Try offset=-1y if you get no data for recent
    time ranges.`,
  fn: function worldbankIndicators(args, tlConfig) {
    var config = _.defaults(args.byName, {
      country: 'wld',
      indicator: 'SP.POP.TOTL'
    });

    var countries = config.country.split(':');
    var seriesLists = _.map(countries, function (country) {
      var code = 'countries/' + country + '/indicators/' + config.indicator;
      var wbArgs = [code];
      wbArgs.byName = {code: code};
      return worldbank.timelionFn(wbArgs, tlConfig);
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
});
