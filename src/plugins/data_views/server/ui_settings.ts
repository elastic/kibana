/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

export const cacheMaxAge = {
  'data_views:cache_max_age': {
    name: i18n.translate('dataViews.advancedSettings.cacheMaxAgeTitle', {
      defaultMessage: 'Field cache max age',
    }),
    value: 300,
    description: i18n.translate('dataViews.advancedSettings.cacheMaxAgeText', {
      defaultMessage:
        "Sets the 'max-age' cache header value for data view fields API requests. A value of 0 will disable caching.",
    }),
    schema: schema.number(),
  },
};
