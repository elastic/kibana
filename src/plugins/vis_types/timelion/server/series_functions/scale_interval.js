/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import alter from '../lib/alter';
import { toMS } from '../../common/lib/to_milliseconds';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';

export default new Chainable('scale_interval', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'interval',
      types: ['string'],
      help: i18n.translate('timelion.help.functions.scaleInterval.args.intervalHelpText', {
        defaultMessage:
          'The new interval in date math notation, e.g., 1s for 1 second. 1m, 5m, 1M, 1w, 1y, etc.',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.scaleIntervalHelpText', {
    defaultMessage:
      'Changes scales a value (usually a sum or a count) to a new interval. For example, as a per-second rate',
  }),
  fn: function scaleIntervalFn(args, tlConfig) {
    const currentInterval = toMS(tlConfig.time.interval);
    const scaleInterval = toMS(args.byName.interval);

    return alter(args, function (eachSeries) {
      const data = _.map(eachSeries.data, function (point) {
        return [point[0], (point[1] / currentInterval) * scaleInterval];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  },
});
