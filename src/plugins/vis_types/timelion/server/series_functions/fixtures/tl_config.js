/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { of } from 'rxjs';
import timelionDefaults from '../../lib/get_namespaced_settings';
import esResponse from './es_response';

export default function () {
  const functions = require('../../lib/load_functions')('series_functions');

  const tlConfig = require('../../handlers/lib/tl_config.js')({
    getFunction: (name) => {
      if (!functions[name]) throw new Error('No such function: ' + name);
      return functions[name];
    },

    esShardTimeout: moment.duration(30000),
  });

  tlConfig.time = {
    interval: '1y',
    from: moment('1980-01-01T00:00:00Z').valueOf(),
    to: moment('1983-01-01T00:00:00Z').valueOf(),
    timezone: 'Etc/UTC',
  };

  tlConfig.settings = timelionDefaults();

  tlConfig.setTargetSeries();

  tlConfig.context = {
    search: { search: () => of({ rawResponse: esResponse }) },
  };

  return tlConfig;
}
