/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  NEWSFEED_DEFAULT_SERVICE_PATH,
  NEWSFEED_DEFAULT_SERVICE_BASE_URL,
  NEWSFEED_DEV_SERVICE_BASE_URL,
  NEWSFEED_FALLBACK_LANGUAGE,
} from '../common/constants';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  service: schema.object({
    pathTemplate: schema.string({ defaultValue: NEWSFEED_DEFAULT_SERVICE_PATH }),
    urlRoot: schema.conditional(
      schema.contextRef('prod'),
      schema.literal(true), // Point to staging if it's not a production release
      schema.string({ defaultValue: NEWSFEED_DEFAULT_SERVICE_BASE_URL }),
      schema.string({ defaultValue: NEWSFEED_DEV_SERVICE_BASE_URL })
    ),
  }),
  defaultLanguage: schema.string({ defaultValue: NEWSFEED_FALLBACK_LANGUAGE }), // TODO: Deprecate since no longer used
  mainInterval: schema.duration({ defaultValue: '2m' }), // (2min) How often to retry failed fetches, and/or check if newsfeed items need to be refreshed from remote
  fetchInterval: schema.duration({ defaultValue: '1d' }), // (1day) How often to fetch remote and reset the last fetched time
});

export type NewsfeedConfigType = TypeOf<typeof configSchema>;
