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
import { toMS } from '../../common/lib/to_milliseconds';

const validPositions = ['left', 'right', 'center'];
const defaultPosition = 'center';

export default new Chainable('movingaverage', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'window',
      types: ['number', 'string'],
      help: i18n.translate('timelion.help.functions.movingaverage.args.windowHelpText', {
        defaultMessage:
          'Number of points, or a date math expression (eg 1d, 1M) to average over. If a date math expression ' +
          'is specified, the function will get as close as possible given the currently select interval. ' +
          'If the date math expression is not evenly divisible by the interval the results may appear abnormal.',
      }),
    },
    {
      name: 'position',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.movingaverage.args.positionHelpText', {
        defaultMessage:
          'Position of the averaged points relative to the result time. One of: {validPositions}',
        values: {
          validPositions: validPositions.join(', '),
        },
      }),
      suggestions: validPositions.map((position) => {
        const suggestion = { name: position };
        if (position === defaultPosition) {
          suggestion.help = 'default';
        }
        return suggestion;
      }),
    },
  ],
  aliases: ['mvavg'],
  help: i18n.translate('timelion.help.functions.movingaverageHelpText', {
    defaultMessage:
      'Calculate the moving average over a given window. Nice for smoothing noisy series',
  }),
  fn: function movingaverageFn(args, tlConfig) {
    return alter(args, function (eachSeries, _window, _position) {
      // _window always needs to be a number, if isn't we have to make it into one.
      if (typeof _window !== 'number') {
        // Ok, I guess its a datemath expression
        const windowMilliseconds = toMS(_window);

        // calculate how many buckets that _window represents
        const intervalMilliseconds = toMS(tlConfig.time.interval);

        // Round, floor, ceil? We're going with round because it splits the difference.
        _window = Math.round(windowMilliseconds / intervalMilliseconds) || 1;
      }

      _position = _position || defaultPosition;
      if (!_.includes(validPositions, _position)) {
        throw new Error(
          i18n.translate(
            'timelion.serverSideErrors.movingaverageFunction.notValidPositionErrorMessage',
            {
              defaultMessage: 'Valid positions are: {validPositions}',
              values: {
                validPositions: validPositions.join(', '),
              },
            }
          )
        );
      }

      const pairs = eachSeries.data;
      const pairsLen = pairs.length;
      eachSeries.label = eachSeries.label + ' mvavg=' + _window;

      function toPoint(point, pairSlice) {
        const average =
          _.chain(pairSlice)
            .map(1)
            .reduce(function (memo, num) {
              return memo + num;
            })
            .value() / _window;

        return [point[0], average];
      }

      if (_position === 'center') {
        const windowLeft = Math.floor(_window / 2);
        const windowRight = _window - windowLeft;
        eachSeries.data = _.map(pairs, function (point, i) {
          if (i < windowLeft || i > pairsLen - windowRight) return [point[0], null];
          return toPoint(point, pairs.slice(i - windowLeft, i + windowRight));
        });
      } else if (_position === 'left') {
        eachSeries.data = _.map(pairs, function (point, i) {
          const cursor = i + 1;
          if (cursor < _window) return [point[0], null];
          return toPoint(point, pairs.slice(cursor - _window, cursor));
        });
      } else if (_position === 'right') {
        eachSeries.data = _.map(pairs, function (point, i) {
          if (i > pairsLen - _window) return [point[0], null];
          return toPoint(point, pairs.slice(i, i + _window));
        });
      }

      return eachSeries;
    });
  },
});
