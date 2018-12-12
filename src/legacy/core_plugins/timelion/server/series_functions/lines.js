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

export default new Chainable('lines', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'width',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.lines.args.widthHelpText', {
        defaultMessage: 'Line thickness',
      }),
    },
    {
      name: 'fill',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.lines.args.fillHelpText', {
        defaultMessage: 'Number between 0 and 10. Use for making area charts',
      }),
    },
    {
      name: 'stack',
      types: ['boolean', 'null'],
      help: i18n.translate('timelion.help.functions.lines.args.stackHelpText', {
        defaultMessage: 'Stack lines, often misleading. At least use some fill if you use this.',
      }),
    },
    {
      name: 'show',
      types: ['number', 'boolean', 'null'],
      help: i18n.translate('timelion.help.functions.lines.args.showHelpText', {
        defaultMessage: 'Show or hide lines',
      }),
    },
    {
      name: 'steps',
      types: ['number', 'boolean', 'null'],
      help: i18n.translate('timelion.help.functions.lines.args.stepsHelpText', {
        defaultMessage: 'Show line as step, e.g., do not interpolate between points',
      }),
    }
  ],
  help: i18n.translate('timelion.help.functions.linesHelpText', {
    defaultMessage: 'Show the seriesList as lines',
  }),
  fn: function linesFn(args) {
    return alter(args, function (eachSeries, width, fill, stack, show, steps) {
      eachSeries.lines = eachSeries.lines || {};

      // Defaults
      if (eachSeries.lines.lineWidth == null) eachSeries.lines.lineWidth = 3;

      if (width != null) eachSeries.lines.lineWidth = width;
      if (fill != null)  eachSeries.lines.fill = fill / 10;
      if (stack != null) eachSeries.stack = stack;
      if (show != null)  eachSeries.lines.show = show;
      if (steps != null) eachSeries.lines.steps = steps;

      return eachSeries;
    });
  }
});
