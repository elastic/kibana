/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginConfigDescriptor } from 'kibana/server';

import { configSchema, ConfigSchema } from '../config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('tagcloud.enabled', 'vis_type_tagcloud.enabled'),
  ],
};

export const plugin = () => ({
  setup() {},
  start() {},
});
