/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// / <reference types="Cypress" />

import fs from 'fs';
import { format } from 'util';

export async function cloudPlugin(_on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
  function debug(...args: unknown[]) {
    if (config.env.currents_debug_enabled) {
      // eslint-disable-next-line no-console
      console.debug('[currents:plugin]', format(...args));
    }
  }

  debug('currents plugin loaded');

  if (config.env.currents_temp_file) {
    debug("dumping config to '%s'", config.env.currents_temp_file);
    fs.writeFileSync(config.env.currents_temp_file, JSON.stringify(config));
    debug("config is availabe at '%s'", config.env.currents_temp_file);
  }

  return config;
}

// eslint-disable-next-line import/no-default-export
export default cloudPlugin;
