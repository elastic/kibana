/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import alter from '../lib/alter';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';

const validSymbols = ['triangle', 'cross', 'square', 'diamond', 'circle'];
const defaultSymbol = 'circle';

export default new Chainable('points', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'radius',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.points.args.radiusHelpText', {
        defaultMessage: 'Size of points',
      }),
    },
    {
      name: 'weight',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.points.args.weightHelpText', {
        defaultMessage: 'Thickness of line around point',
      }),
    },
    {
      name: 'fill',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.points.args.fillHelpText', {
        defaultMessage: 'Number between 0 and 10 representing opacity of fill',
      }),
    },
    {
      name: 'fillColor',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.points.args.fillColorHelpText', {
        defaultMessage: 'Color with which to fill point',
      }),
    },
    {
      name: 'symbol',
      help: i18n.translate('timelion.help.functions.points.args.symbolHelpText', {
        defaultMessage: 'point symbol. One of: {validSymbols}',
        values: {
          validSymbols: validSymbols.join(', '),
        },
      }),
      types: ['string', 'null'],
      suggestions: validSymbols.map((symbol) => {
        const suggestion = { name: symbol };
        if (symbol === defaultSymbol) {
          suggestion.help = 'default';
        }
        return suggestion;
      }),
    },
    {
      name: 'show',
      types: ['boolean', 'null'],
      help: i18n.translate('timelion.help.functions.points.args.showHelpText', {
        defaultMessage: 'Show points or not',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.pointsHelpText', {
    defaultMessage: 'Show the series as points',
  }),
  fn: function pointsFn(args) {
    return alter(args, function (eachSeries, radius, weight, fill, fillColor, symbol, show) {
      eachSeries.points = eachSeries.points || {};
      eachSeries.points.radius = radius == null ? undefined : radius;

      if (fill) {
        eachSeries.points.fillColor = fillColor == null ? false : fillColor;
      }

      if (fill != null) {
        eachSeries.points.fill = fill / 10;
      }

      if (weight != null) {
        eachSeries.points.lineWidth = weight;
      }

      symbol = symbol || defaultSymbol;
      if (!_.includes(validSymbols, symbol)) {
        throw new Error(
          i18n.translate('timelion.serverSideErrors.pointsFunction.notValidSymbolErrorMessage', {
            defaultMessage: 'Valid symbols are: {validSymbols}',
            values: {
              validSymbols: validSymbols.join(', '),
            },
          })
        );
      }

      eachSeries.points.symbol = symbol;

      eachSeries.points.show = show == null ? true : show;

      return eachSeries;
    });
  },
});
