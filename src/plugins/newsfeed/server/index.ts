/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginConfigDescriptor } from 'kibana/server';
import { NewsfeedPlugin } from './plugin';
import { configSchema, NewsfeedConfigType } from './config';

export const config: PluginConfigDescriptor<NewsfeedConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    service: true,
    mainInterval: true,
    fetchInterval: true,
  },
  deprecations: ({ unused }) => [unused('defaultLanguage')],
};

export function plugin() {
  return new NewsfeedPlugin();
}
