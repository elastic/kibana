/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { statSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export function list(pluginDir, logger) {
  const plugins = readdirSync(pluginDir)
    .map((name) => [name, statSync(join(pluginDir, name))])
    .filter(([name, stat]) => stat.isDirectory() && name[0] !== '.');

  if (plugins.length === 0) {
    logger.log('No plugins installed.');
    return;
  }

  plugins.forEach(([name]) => {
    try {
      const packagePath = join(pluginDir, name, 'kibana.json');
      const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
      logger.log(pkg.id + '@' + pkg.version);
    } catch (e) {
      throw new Error('Unable to read kibana.json file for plugin ' + name);
    }
  });
}
