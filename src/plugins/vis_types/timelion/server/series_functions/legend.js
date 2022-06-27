/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import alter from '../lib/alter';
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
    return alter(
      args,
      function (eachSeries, position, columns, showTime = true, timeFormat = DEFAULT_TIME_FORMAT) {
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
      }
    );
  },
});
