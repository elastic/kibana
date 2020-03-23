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
fetch.Promise = require('bluebird');

import Datasource from '../lib/classes/datasource';

export default new Datasource('quandl', {
  dataSource: true,
  args: [
    {
      name: 'code',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.quandl.args.codeHelpText', {
        defaultMessage: 'The quandl code to plot. You can find these on quandl.com.',
      }),
    },
    {
      name: 'position',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.quandl.args.positionHelpText', {
        defaultMessage:
          'Some quandl sources return multiple series, which one should I use? 1 based index.',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.quandlHelpText', {
    defaultMessage: `
    [experimental]
    Pull data from quandl.com using the quandl code. Set {quandlKeyField} to your free API key in Kibana's
    Advanced Settings. The API has a really low rate limit without a key.`,
    values: {
      quandlKeyField: '"timelion:quandl.key"',
    },
  }),
  fn: function quandlFn(args, tlConfig) {
    const intervalMap = {
      '1d': 'daily',
      '1w': 'weekly',
      '1M': 'monthly',
      '1y': 'annual',
    };

    const config = _.defaults(args.byName, {
      code: 'WIKI/AAPL',
      position: 1,
      interval: intervalMap[tlConfig.time.interval],
      apikey: tlConfig.settings['timelion:quandl.key'],
    });

    if (!config.interval) {
      throw new Error(
        i18n.translate('timelion.serverSideErrors.quandlFunction.unsupportedIntervalErrorMessage', {
          defaultMessage:
            'quandl() unsupported interval: {interval}. quandl() supports: {intervals}',
          values: {
            interval: tlConfig.time.interval,
            intervals: _.keys(intervalMap).join(', '),
          },
        })
      );
    }

    const time = {
      min: moment.utc(tlConfig.time.from).format('YYYY-MM-DD'),
      max: moment.utc(tlConfig.time.to).format('YYYY-MM-DD'),
    };

    // POSITIONS
    // 1. open
    // 2. high
    // 3. low
    // 4. close
    // 5. volume

    const URL =
      'https://www.quandl.com/api/v1/datasets/' +
      config.code +
      '.json' +
      '?sort_order=asc' +
      '&trim_start=' +
      time.min +
      '&trim_end=' +
      time.max +
      '&collapse=' +
      config.interval +
      '&auth_token=' +
      config.apikey;

    return fetch(URL)
      .then(function(resp) {
        return resp.json();
      })
      .then(function(resp) {
        const data = _.map(resp.data, function(bucket) {
          return [moment(bucket[0]).valueOf(), bucket[config.position]];
        });

        return {
          type: 'seriesList',
          list: [
            {
              data: data,
              type: 'series',
              fit: 'nearest',
              label: resp.name,
            },
          ],
        };
      });
  },
});
