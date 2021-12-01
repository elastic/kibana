/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import worldbank from './worldbank.js';
import Datasource from '../lib/classes/datasource';

export default new Datasource('worldbank_indicators', {
  args: [
    {
      name: 'country', // countries/all/indicators/SP.POP.TOTL
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.worldbankIndicators.args.countryHelpText', {
        defaultMessage: `Worldbank country identifier. Usually the country's 2 letter code`,
      }),
    },
    {
      name: 'indicator',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.worldbankIndicators.args.indicatorHelpText', {
        defaultMessage:
          `The indicator code to use. You'll have to look this up on {worldbankUrl}. ` +
          'Often pretty obtuse. E.g., {indicatorExample} is population',
        values: {
          worldbankUrl: 'data.worldbank.org',
          indicatorExample: 'SP.POP.TOTL',
        },
      }),
    },
  ],
  aliases: ['wbi'],
  help: i18n.translate('timelion.help.functions.worldbankIndicatorsHelpText', {
    defaultMessage: `
    [experimental]
    Pull data from {worldbankUrl} using the country name and indicator. The worldbank provides
    mostly yearly data, and often has no data for the current year. Try {offsetQuery} if you get no data for recent
    time ranges.`,
    values: {
      worldbankUrl: 'https://api.worldbank.org/v2/',
      offsetQuery: 'offset=-1y',
    },
  }),
  fn: function worldbankIndicators(args, tlConfig) {
    const config = _.defaults(args.byName, {
      country: 'wld',
      indicator: 'SP.POP.TOTL',
    });

    const countries = config.country.split(':');
    const seriesLists = _.map(countries, function (country) {
      const code = 'country/' + country + '/indicator/' + config.indicator;
      const wbArgs = [code];
      wbArgs.byName = { code: code };
      return worldbank.timelionFn(wbArgs, tlConfig);
    });

    return Promise.all(
      seriesLists.map(function (seriesList) {
        return seriesList.list[0];
      })
    ).then(function (list) {
      return {
        type: 'seriesList',
        list: list,
      };
    });
  },
});
