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
import alter from '../lib/alter.js';
import Chainable from '../lib/classes/chainable';
const tickFormatters = {
  'bits': 'bits',
  'bits/s': 'bits/s',
  'bytes': 'bytes',
  'bytes/s': 'bytes/s',
  'currency': 'currency(:ISO 4217 currency code)',
  'percent': 'percent',
  'custom': 'custom(:prefix:suffix)'
};

export default new Chainable('yaxis', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'yaxis',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.yaxis.args.yaxisHelpText', {
        defaultMessage:
          'The numbered y-axis to plot this series on, e.g., .yaxis(2) for a 2nd y-axis.',
      }),
    },
    {
      name: 'min',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.yaxis.args.minHelpText', {
        defaultMessage: 'Min value',
      }),
    },
    {
      name: 'max',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.yaxis.args.maxHelpText', {
        defaultMessage: 'Max value',
      }),
    },
    {
      name: 'position',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.yaxis.args.positionHelpText', {
        defaultMessage: 'left or right',
      }),
    },
    {
      name: 'label',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.yaxis.args.labelHelpText', {
        defaultMessage: 'Label for axis',
      }),
    },
    {
      name: 'color',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.yaxis.args.colorHelpText', {
        defaultMessage: 'Color of axis label',
      }),
    },
    {
      name: 'units',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.yaxis.args.unitsHelpText', {
        defaultMessage: 'The function to use for formatting y-axis labels. One of: {formatters}',
        values: {
          formatters: _.values(tickFormatters).join(', '),
        },
      }),
      suggestions: _.keys(tickFormatters).map(key => {
        return { name: key, help: tickFormatters[key] };
      })
    },
    {
      name: 'tickDecimals',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.yaxis.args.tickDecimalsHelpText', {
        defaultMessage: 'The number of decimal places for the y-axis tick labels.',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.yaxisHelpText', {
    defaultMessage:
      'Configures a variety of y-axis options, the most important likely being the ability to add an Nth (eg 2nd) y-axis',
  }),
  fn: function yaxisFn(args) {
    return alter(args, function (eachSeries, yaxis, min, max, position, label, color, units, tickDecimals) {
      yaxis = yaxis || 1;

      eachSeries.yaxis = yaxis;
      eachSeries._global = eachSeries._global || {};

      eachSeries._global.yaxes = eachSeries._global.yaxes || [];
      eachSeries._global.yaxes[yaxis - 1] = eachSeries._global.yaxes[yaxis - 1] || {};

      const myAxis = eachSeries._global.yaxes[yaxis - 1];
      myAxis.position = position || (yaxis % 2 ? 'left' : 'right');
      myAxis.min = min;
      myAxis.max = max;
      myAxis.axisLabelFontSizePixels = 11;
      myAxis.axisLabel = label;
      myAxis.axisLabelColour = color;
      myAxis.axisLabelUseCanvas = true;

      if (tickDecimals) {
        myAxis.tickDecimals = tickDecimals < 0 ? 0 : tickDecimals;
      }

      if (units) {
        const unitTokens = units.split(':');
        const unitType = unitTokens[0];
        if (!tickFormatters[unitType]) {
          throw new Error (
            i18n.translate(
              'timelion.serverSideErrors.yaxisFunction.notSupportedUnitTypeErrorMessage',
              {
                defaultMessage: '{units} is not a supported unit type.',
                values: { units },
              })
          );
        }
        if (unitType === 'currency') {
          const threeLetterCode = /^[A-Za-z]{3}$/;
          const currency = unitTokens[1];
          if (currency && !threeLetterCode.test(currency)) {
            throw new Error(
              i18n.translate('timelion.serverSideErrors.yaxisFunction.notValidCurrencyFormatErrorMessage', {
                defaultMessage: 'Currency must be a three letter code',
              })
            );
          }
        }

        myAxis.units = {
          type: unitType,
          prefix: unitTokens[1] || '',
          suffix: unitTokens[2] || ''
        };

        if (unitType === 'percent') {
          // jquery.flot uses axis.tickDecimals to generate tick values
          // need 2 extra decimal places to preserve precision when percent shifts value to left
          myAxis.units.tickDecimalsShift = 2;
          if (tickDecimals) {
            myAxis.tickDecimals += myAxis.units.tickDecimalsShift;
          } else {
            myAxis.tickDecimals = myAxis.units.tickDecimalsShift;
          }
        }
      }

      return eachSeries;
    });
  }
});
