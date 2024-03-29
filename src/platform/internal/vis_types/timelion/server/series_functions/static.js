/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import Datasource from '../lib/classes/datasource';

export default new Datasource('static', {
  aliases: ['value'],
  args: [
    {
      name: 'value', // _test-data.users.*.data
      types: ['number', 'string'],
      help: i18n.translate('timelion.help.functions.static.args.valueHelpText', {
        defaultMessage:
          'The single value to display, you can also pass several values and I will interpolate them evenly across your time range.',
      }),
    },
    {
      name: 'label',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.static.args.labelHelpText', {
        defaultMessage:
          'A quick way to set the label for the series. You could also use the .label() function',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.staticHelpText', {
    defaultMessage: 'Draws a single value across the chart',
  }),
  fn: function staticFn(args, tlConfig) {
    let data;
    const target = tlConfig.getTargetSeries();
    if (typeof args.byName.value === 'string') {
      const points = args.byName.value.split(':');
      const begin = _.first(target)[0];
      const end = _.last(target)[0];
      const step = (end - begin) / (points.length - 1);
      data = _.map(points, function (point, i) {
        return [begin + i * step, parseFloat(point)];
      });
    } else {
      data = _.map(target, function (bucket) {
        return [bucket[0], args.byName.value];
      });
    }

    return Promise.resolve({
      type: 'seriesList',
      list: [
        {
          data: data,
          type: 'series',
          label: args.byName.label == null ? String(args.byName.value) : args.byName.label,
          fit: args.byName.fit || 'average',
        },
      ],
    });
  },
});
