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
import fetch from 'node-fetch';
import moment from 'moment';
import Datasource from '../lib/classes/datasource';

export default new Datasource('worldbank', {
  args: [
    {
      name: 'code', // countries/all/indicators/SP.POP.TOTL
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.worldbank.args.codeHelpText', {
        defaultMessage:
          'Worldbank API path. This is usually everything after the domain, before the querystring. E.g.: {apiPathExample}.',
        values: {
          apiPathExample: '/en/countries/ind;chn/indicators/DPANUSSPF',
        },
      }),
    },
  ],
  aliases: ['wb'],
  help: i18n.translate('timelion.help.functions.worldbankHelpText', {
    defaultMessage: `
    [experimental]
    Pull data from {worldbankUrl} using path to series.
    The worldbank provides mostly yearly data, and often has no data for the current year.
    Try {offsetQuery} if you get no data for recent time ranges.`,
    values: {
      worldbankUrl: 'https://api.worldbank.org/v2/',
      offsetQuery: 'offset=-1y',
    },
  }),
  fn: function worldbank(args, tlConfig) {
    // http://api.worldbank.org/en/countries/ind;chn/indicators/DPANUSSPF?date=2000:2006&MRV=5

    const config = _.defaults(args.byName, {
      code: 'country/all/indicator/SP.POP.TOTL',
    });

    const time = {
      min: moment(tlConfig.time.from).format('YYYY'),
      max: moment(tlConfig.time.to).format('YYYY'),
    };

    const URL =
      'https://api.worldbank.org/v2/' +
      config.code +
      '?date=' +
      time.min +
      ':' +
      time.max +
      '&format=json' +
      '&per_page=1000';

    return fetch(URL)
      .then(function(resp) {
        return resp.json();
      })
      .then(function(resp) {
        let hasData = false;

        const respSeries = resp[1];

        const deduped = {};
        let description;
        _.each(respSeries, function(bucket) {
          if (bucket.value != null) hasData = true;
          description = bucket.country.value + ' ' + bucket.indicator.value;
          deduped[bucket.date] = bucket.value;
        });

        const data = _.compact(
          _.map(deduped, function(val, date) {
            // Discard nulls
            if (val == null) return;
            return [moment(date, 'YYYY').valueOf(), Number(val)];
          })
        );

        if (!hasData) {
          throw new Error(
            i18n.translate('timelion.serverSideErrors.worldbankFunction.noDataErrorMessage', {
              defaultMessage: 'Worldbank request succeeded, but there was no data for {code}',
              values: {
                code: config.code,
              },
            })
          );
        }

        return {
          type: 'seriesList',
          list: [
            {
              data: data,
              type: 'series',
              label: description,
              _meta: {
                worldbank_request: URL,
              },
            },
          ],
        };
      })
      .catch(function(e) {
        throw e;
      });
  },
});
