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

export default new Datasource('graphite', {
  args: [
    {
      name: 'metric', // _test-data.users.*.data
      types: ['string'],
      help: i18n.translate('timelion.help.functions.graphite.args.metricHelpText', {
        defaultMessage: 'Graphite metric to pull, e.g., {metricExample}',
        values: {
          metricExample: '_test-data.users.*.data',
        },
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.graphiteHelpText', {
    defaultMessage: `[experimental] Pull data from graphite. Configure your graphite server in Kibana's Advanced Settings`,
  }),
  fn: function graphite(args, tlConfig) {
    const config = args.byName;

    const time = {
      min: moment(tlConfig.time.from).format('HH:mm[_]YYYYMMDD'),
      max: moment(tlConfig.time.to).format('HH:mm[_]YYYYMMDD'),
    };
    const allowedUrls = tlConfig.allowedGraphiteUrls;
    const configuredUrl = tlConfig.settings['timelion:graphite.url'];
    if (!allowedUrls.includes(configuredUrl)) {
      throw new Error(
        i18n.translate('timelion.help.functions.notAllowedGraphiteUrl', {
          defaultMessage: `This graphite URL is not configured on the kibana.yml file.
          Please configure your graphite server list in the kibana.yml file under 'timelion.graphiteUrls' and
          select one from Kibana's Advanced Settings`,
        })
      );
    }

    const URL =
      tlConfig.settings['timelion:graphite.url'] +
      '/render/' +
      '?format=json' +
      '&from=' +
      time.min +
      '&until=' +
      time.max +
      '&target=' +
      config.metric;

    return fetch(URL)
      .then(function (resp) {
        return resp.json();
      })
      .then(function (resp) {
        const list = _.map(resp, function (series) {
          const data = _.map(series.datapoints, function (point) {
            return [point[1] * 1000, point[0]];
          });
          return {
            data: data,
            type: 'series',
            fit: 'nearest', // TODO make this customizable
            label: series.target,
          };
        });

        return {
          type: 'seriesList',
          list: list,
        };
      })
      .catch(function (e) {
        throw e;
      });
  },
});
