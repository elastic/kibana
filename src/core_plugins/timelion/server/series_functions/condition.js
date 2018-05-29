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
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';
import argType from '../handlers/lib/arg_type.js';

export default new Chainable('condition', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'operator', // <, <=, >, >=, ==, !=
      types: ['string'],
      help: 'comparision operator to use for comparison, valid operators are eq (equal), ne (not equal), lt (less than), lte ' +
        '(less than equal), gt (greater than), gte (greater than equal)',
      suggestions: [
        {
          name: 'eq',
          help: 'equal',
        },
        {
          name: 'ne',
          help: 'not equal'
        },
        {
          name: 'lt',
          help: 'less than'
        },
        {
          name: 'lte',
          help: 'less than equal'
        },
        {
          name: 'gt',
          help: 'greater than'
        },
        {
          name: 'gte',
          help: 'greater than equal'
        }
      ]
    },
    {
      name: 'if',
      types: ['number', 'seriesList', 'null'],
      help: 'The value to which the point will be compared. If you pass a seriesList here the first series will be used'
    },
    {
      name: 'then',
      types: ['number', 'seriesList', 'null'],
      help: 'The value the point will be set to if the comparison is true. If you pass a seriesList here the first series will be used'
    },
    {
      name: 'else',
      types: ['number', 'seriesList', 'null'],
      help: 'The value the point will be set to if the comparison is false. If you pass a seriesList here the first series will be used'
    }
  ],
  help: 'Compares each point to a number, or the same point in another series using an operator, then sets its value' +
    'to the result if the condition proves true, with an optional else.',
  aliases: ['if'],
  fn: function conditionFn(args) {
    const config = args.byName;
    return alter(args, function (eachSeries) {
      const data = _.map(eachSeries.data, function (point, i) {
        function getNumber(source) {
          if (argType(source) === 'number') return source;
          if (argType(source) === 'null') return null;
          if (argType(source) === 'seriesList') return source.list[0].data[i][1];
          throw new Error ('must be a number or a seriesList');
        }

        const ifVal = getNumber(config.if);
        const thenVal = getNumber(config.then);
        const elseVal = _.isUndefined(config.else) ? point[1] : getNumber(config.else);

        const newValue = (function () {
          switch (config.operator) {
            case 'lt':
              return point[1] <   ifVal ? thenVal : elseVal;
            case 'lte':
              return point[1] <=  ifVal ? thenVal : elseVal;
            case 'gt':
              return point[1] >   ifVal ? thenVal : elseVal;
            case 'gte':
              return point[1] >=  ifVal ? thenVal : elseVal;
            case 'eq':
              return point[1] === ifVal ? thenVal : elseVal;
            case 'ne':
              return point[1] !== ifVal ? thenVal : elseVal;
            default:
              throw new Error ('Unknown operator');
          }
        }());

        return [point[0], newValue];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  }
});
