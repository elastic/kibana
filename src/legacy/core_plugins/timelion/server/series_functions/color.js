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
import Chainable from '../lib/classes/chainable';
import tinygradient from 'tinygradient';

export default new Chainable('color', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'color',
      types: ['string'],
      help: i18n.translate('timelion.help.functions.color.args.colorHelpText', {
        defaultMessage:
          'Color of series, as hex, e.g., #c6c6c6 is a lovely light grey. If you specify multiple \
colors, and have multiple series, you will get a gradient, e.g., "#00B1CC:#00FF94:#FF3A39:#CC1A6F"',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.colorHelpText', {
    defaultMessage: 'Change the color of the series',
  }),
  fn: function colorFn(args) {
    const colors = args.byName.color.split(':');
    const gradientStops = args.byName.inputSeries.list.length;
    let gradient;
    if (colors.length > 1 && gradientStops > 1) {
      // trim number of colors to avoid exception thrown by having more colors than gradient stops
      let trimmedColors = colors;
      if (colors.length > gradientStops) {
        trimmedColors = colors.slice(0, gradientStops);
      }
      gradient = tinygradient(trimmedColors).rgb(gradientStops);
    }

    let i = 0;
    return alter(args, function(eachSeries) {
      if (gradient) {
        eachSeries.color = gradient[i++].toHexString();
      } else if (colors.length === 1 || gradientStops === 1) {
        eachSeries.color = colors[0];
      } else {
        throw new Error(
          i18n.translate('timelion.serverSideErrors.colorFunction.colorNotProvidedErrorMessage', {
            defaultMessage: 'color not provided',
          })
        );
      }

      return eachSeries;
    });
  },
});
