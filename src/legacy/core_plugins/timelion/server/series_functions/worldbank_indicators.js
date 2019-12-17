/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import worldbank from './worldbank.js';
import Bluebird from 'bluebird';
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
      worldbankUrl: 'http://data.worldbank.org/',
      offsetQuery: 'offset=-1y',
    },
  }),
  fn: function worldbankIndicators(args, tlConfig) {
    const config = _.defaults(args.byName, {
      country: 'wld',
      indicator: 'SP.POP.TOTL',
    });

    const countries = config.country.split(':');
    const seriesLists = _.map(countries, function(country) {
      const code = 'countries/' + country + '/indicators/' + config.indicator;
      const wbArgs = [code];
      wbArgs.byName = { code: code };
      return worldbank.timelionFn(wbArgs, tlConfig);
    });

    return Bluebird.map(seriesLists, function(seriesList) {
      return seriesList.list[0];
    }).then(function(list) {
      return {
        type: 'seriesList',
        list: list,
      };
    });
  },
});
