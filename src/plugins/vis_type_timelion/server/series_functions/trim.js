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
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';

export default new Chainable('trim', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'start',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.trim.args.startHelpText', {
        defaultMessage: 'Buckets to trim from the beginning of the series. Default: 1',
      }),
    },
    {
      name: 'end',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.trim.args.endHelpText', {
        defaultMessage: 'Buckets to trim from the end of the series. Default: 1',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.trimHelpText', {
    defaultMessage:
      'Set N buckets at the start or end of a series to null to fit the "partial bucket issue"',
  }),
  fn: function conditionFn(args) {
    const config = args.byName;
    if (config.start == null) config.start = 1;
    if (config.end == null) config.end = 1;

    return alter(args, function (eachSeries) {
      _.times(config.start, function (i) {
        eachSeries.data[i][1] = null;
      });

      _.times(config.end, function (i) {
        eachSeries.data[eachSeries.data.length - 1 - i][1] = null;
      });

      return eachSeries;
    });
  },
});
