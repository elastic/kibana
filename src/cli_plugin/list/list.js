/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { statSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export function list(pluginDir, logger) {
  readdirSync(pluginDir).forEach((name) => {
    const stat = statSync(join(pluginDir, name));

    if (stat.isDirectory() && name[0] !== '.') {
      try {
        const packagePath = join(pluginDir, name, 'kibana.json');
        const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
        logger.log(pkg.id + '@' + pkg.version);
      } catch (e) {
        throw new Error('Unable to read kibana.json file for plugin ' + name);
      }
    }
  });

  logger.log(''); //intentional blank line for aesthetics
}
