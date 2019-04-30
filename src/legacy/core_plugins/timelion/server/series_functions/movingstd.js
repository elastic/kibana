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

const positions = ['left', 'right', 'center'];
const defaultPosition = positions[0];

export default new Chainable('movingstd', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'window',
      types: ['number'],
      help: i18n.translate('timelion.help.functions.movingstd.args.windowHelpText', {
        defaultMessage: 'Number of points to compute the standard deviation over.',
      }),
    },
    {
      name: 'position',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.movingstd.args.positionHelpText', {
        defaultMessage:
          'Position of the window slice relative to the result time. Options are {positions}. Default: {defaultPosition}',
        values: {
          positions: positions.join(', '),
          defaultPosition,
        },
      }),
    }
  ],
  aliases: ['mvstd'],
  help: i18n.translate('timelion.help.functions.movingstdHelpText', {
    defaultMessage:
      'Calculate the moving standard deviation over a given window. Uses naive two-pass algorithm. ' +
      'Rounding errors may become more noticeable with very long series, or series with very large numbers.',
  }),
  fn: function movingstdFn(args) {
    return alter(args, function (eachSeries, _window, _position) {

      _position = _position || defaultPosition;

      if (!_.contains(positions, _position)) {
        throw new Error(
          i18n.translate('timelion.serverSideErrors.movingstdFunction.notValidPositionErrorMessage', {
            defaultMessage: 'Valid positions are: {validPositions}',
            values: {
              validPositions: positions.join(', '),
            },
          }),
        );
      }

      const pairs = eachSeries.data;
      const pairsLen = pairs.length;
      eachSeries.label = eachSeries.label + ' mvstd=' + _window;

      function toPoint(point, pairSlice) {
        const average = _.chain(pairSlice).map(1).reduce(function (memo, num) {
          return memo + num;
        }).value() / _window;

        const variance = _.chain(pairSlice).map(function (point) {
          return Math.pow(point[1] - average, 2);
        }).reduce(function (memo, num) {
          return memo + num;
        }).value() / (_window - 1);

        return [point[0], Math.sqrt(variance)];
      }

      if (_position === 'center') {
        const windowLeft = Math.floor(_window / 2);
        const windowRight = _window - windowLeft;
        eachSeries.data = _.map(pairs, function (point, i) {
          if (i < windowLeft || i >= pairsLen - windowRight) return [point[0], null];
          return toPoint(point, pairs.slice(i - windowLeft, i + windowRight));
        });
      } else if (_position === 'left') {
        eachSeries.data = _.map(pairs, function (point, i) {
          if (i < _window) return [point[0], null];
          return toPoint(point, pairs.slice(i - _window, i));
        });
      } else if (_position === 'right') {
        eachSeries.data = _.map(pairs, function (point, i) {
          if (i >= pairsLen - _window) return [point[0], null];
          return toPoint(point, pairs.slice(i, i + _window));
        });
      }

      return eachSeries;
    });
  }
});
