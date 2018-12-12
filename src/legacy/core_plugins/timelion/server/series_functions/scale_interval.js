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
import alter from '../lib/alter.js';
import toMS from '../lib/to_milliseconds.js';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';

export default new Chainable('scale_interval', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'interval',
      types: ['string'],
      help: i18n.translate('timelion.help.functions.scaleInterval.args.intervalHelpText', {
        defaultMessage:
          'The new interval in date math notation, e.g., 1s for 1 second. 1m, 5m, 1M, 1w, 1y, etc.',
      }),
    }
  ],
  help: i18n.translate('timelion.help.functions.scaleIntervalHelpText', {
    defaultMessage:
      'Changes scales a value (usually a sum or a count) to a new interval. For example, as a per-second rate',
  }),
  fn: function scaleIntervalFn(args, tlConfig) {
    const currentInterval = toMS(tlConfig.time.interval);
    const scaleInterval = toMS(args.byName.interval);

    return alter(args, function (eachSeries) {
      const data = _.map(eachSeries.data, function (point) {
        return [point[0], (point[1] / currentInterval) * scaleInterval];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  }
});
