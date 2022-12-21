/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    const configuredUrl = tlConfig.settings['timelion:graphite.url'] || allowedUrls[0];
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
      configuredUrl +
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
