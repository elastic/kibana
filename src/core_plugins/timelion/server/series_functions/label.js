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

import alter from '../lib/alter.js';
import Chainable from '../lib/classes/chainable';

export default new Chainable('label', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'label',
      types: ['string'],
      help: 'Legend value for series. You can use $1, $2, etc, in the string to match up with the regex capture groups'
    },
    {
      name: 'regex',
      types: ['string', 'null'],
      help: 'A regex with capture group support'
    }
  ],
  help: 'Change the label of the series. Use %s reference the existing label',
  fn: function labelFn(args) {
    const config = args.byName;
    return alter(args, function (eachSeries) {
      if (config.regex) {
        eachSeries.label = eachSeries.label.replace(new RegExp(config.regex), config.label);
      } else {
        eachSeries.label = config.label;
      }

      return eachSeries;
    });
  }
});
