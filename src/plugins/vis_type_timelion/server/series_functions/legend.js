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
import { DEFAULT_TIME_FORMAT } from '../../common/lib';

export default new Chainable('legend', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'position',
      types: ['string', 'boolean', 'null'],
      help: i18n.translate('timelion.help.functions.legend.args.positionHelpText', {
        defaultMessage:
          'Corner to place the legend in: nw, ne, se, or sw. You can also pass false to disable the legend',
        description: '"nw", "ne", "se", "sw" and "false" are keywords and must not be translated.',
      }),
      suggestions: [
        {
          name: 'false',
          help: i18n.translate(
            'timelion.help.functions.legend.args.position.suggestions.falseHelpText',
            {
              defaultMessage: 'disable legend',
            }
          ),
        },
        {
          name: 'nw',
          help: i18n.translate(
            'timelion.help.functions.legend.args.position.suggestions.nwHelpText',
            {
              defaultMessage: 'place legend in north west corner',
            }
          ),
        },
        {
          name: 'ne',
          help: i18n.translate(
            'timelion.help.functions.legend.args.position.suggestions.neHelpText',
            {
              defaultMessage: 'place legend in north east corner',
            }
          ),
        },
        {
          name: 'se',
          help: i18n.translate(
            'timelion.help.functions.legend.args.position.suggestions.seHelpText',
            {
              defaultMessage: 'place legend in south east corner',
            }
          ),
        },
        {
          name: 'sw',
          help: i18n.translate(
            'timelion.help.functions.legend.args.position.suggestions.swHelpText',
            {
              defaultMessage: 'place legend in south west corner',
            }
          ),
        },
      ],
    },
    {
      name: 'columns',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.legend.args.columnsHelpText', {
        defaultMessage: 'Number of columns to divide the legend into',
      }),
    },
    {
      name: 'showTime',
      types: ['boolean'],
      help: i18n.translate('timelion.help.functions.legend.args.showTimeHelpText', {
        defaultMessage: 'Show time value in legend when hovering over graph. Default: true',
      }),
    },
    {
      name: 'timeFormat',
      types: ['string'],
      help: i18n.translate('timelion.help.functions.legend.args.timeFormatHelpText', {
        defaultMessage: 'moment.js format pattern. Default: {defaultTimeFormat}',
        values: {
          defaultTimeFormat: DEFAULT_TIME_FORMAT,
        },
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.legendHelpText', {
    defaultMessage: 'Set the position and style of the legend on the plot',
  }),
  fn: function legendFn(args) {
    return alter(args, function (
      eachSeries,
      position,
      columns,
      showTime = true,
      timeFormat = DEFAULT_TIME_FORMAT
    ) {
      eachSeries._global = eachSeries._global || {};
      eachSeries._global.legend = eachSeries._global.legend || {};
      eachSeries._global.legend.noColumns = columns;
      eachSeries._global.legend.showTime = showTime;
      eachSeries._global.legend.timeFormat = timeFormat;

      if (position === false) {
        eachSeries._global.legend.show = false;
        eachSeries._global.legend.showTime = false;
      } else {
        eachSeries._global.legend.position = position;
      }

      return eachSeries;
    });
  },
});
