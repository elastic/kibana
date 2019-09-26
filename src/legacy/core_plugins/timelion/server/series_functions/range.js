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

export default new Chainable('range', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'min',
      types: ['number'],
      help: i18n.translate('timelion.help.functions.range.args.minHelpText', {
        defaultMessage: 'New minimum value',
      }),
    },
    {
      name: 'max',
      types: ['number'],
      help: i18n.translate('timelion.help.functions.range.args.maxHelpText', {
        defaultMessage: 'New maximum value',
      }),
    }
  ],
  help: i18n.translate('timelion.help.functions.rangeHelpText', {
    defaultMessage: 'Changes the max and min of a series while keeping the same shape',
  }),
  fn: function range(args) {
    return alter(args, function (eachSeries) {
      const values = _.map(eachSeries.data, 1);
      const min = _.min(values);
      const max = _.max(values);

      // newvalue= (max'-min')/(max-min)*(value-min)+min'.
      const data = _.map(eachSeries.data, function (point) {
        const val = (args.byName.max - args.byName.min) /
          (max - min) * (point[1] - min) + args.byName.min;
        return [point[0], val];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  }
});
