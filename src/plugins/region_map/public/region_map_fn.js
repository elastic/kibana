/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const createRegionMapFn = () => ({
  name: 'regionmap',
  type: 'render',
  context: {
    types: ['datatable'],
  },
  help: i18n.translate('regionMap.function.help', {
    defaultMessage: 'Regionmap visualization',
  }),
  args: {
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
    },
  },
  fn(context, args) {
    const visConfig = JSON.parse(args.visConfig);

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: context,
        visType: 'region_map',
        visConfig,
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
