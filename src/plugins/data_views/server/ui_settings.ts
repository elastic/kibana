/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { DEFAULT_FIELD_CACHE_FRESHNESS } from './constants';

export const cacheMaxAge = {
  'data_views:cache_max_age': {
    name: i18n.translate('dataViews.advancedSettings.cacheMaxAgeTitle', {
      defaultMessage: 'Field cache max age (in seconds)',
    }),
    value: DEFAULT_FIELD_CACHE_FRESHNESS,
    description: i18n.translate('dataViews.advancedSettings.cacheMaxAgeText', {
      defaultMessage:
        'Sets how long data view fields API requests are cached in seconds. A value of 0 turns off caching. Modifying this value may not take immediate effect, users need to clear browser cache or wait until the current cache expires. To see immediate changes, try a hard reload of Kibana.',
    }),
    schema: schema.number(),
  },
};
