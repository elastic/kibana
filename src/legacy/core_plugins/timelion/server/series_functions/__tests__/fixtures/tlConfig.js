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

import moment from 'moment';
import { of } from 'rxjs';
import sinon from 'sinon';
import timelionDefaults from '../../../lib/get_namespaced_settings';
import esResponse from './es_response';

export default function () {
  const functions = require('../../../lib/load_functions')('series_functions');
  const server = {
    plugins: {
      timelion: {
        getFunction: (name) => {
          if (!functions[name]) throw new Error ('No such function: ' + name);
          return functions[name];
        }
      },
      elasticsearch: {
        getCluster: sinon.stub().withArgs('data').returns({
          callWithRequest: function () {
            return Promise.resolve(esResponse);
          }
        })
      }
    },
    newPlatform: {
      setup: {
        core: {
          elasticsearch: {
            legacy: { config$: of({ shardTimeout: moment.duration(30000) }) }
          }
        }
      }
    },
  };

  const tlConfig = require('../../../handlers/lib/tl_config.js')({
    server: server,
    request: {}
  });

  tlConfig.time = {
    interval: '1y',
    from: moment('1980-01-01T00:00:00Z').valueOf(),
    to: moment('1983-01-01T00:00:00Z').valueOf(),
    timezone: 'Etc/UTC'
  };

  tlConfig.settings = timelionDefaults;

  tlConfig.setTargetSeries();

  return tlConfig;
}
