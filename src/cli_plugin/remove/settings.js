/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';

import { fromRoot } from '../../core/server/utils';

export function parse(command, options) {
  const settings = {
    quiet: options.quiet || false,
    silent: options.silent || false,
    config: options.config || '',
    pluginDir: fromRoot('plugins'),
    plugin: command,
  };

  settings.pluginPath = resolve(settings.pluginDir, settings.plugin);

  return settings;
}
