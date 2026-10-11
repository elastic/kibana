/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify } from 'yaml';
import type { Task } from '../lib';
import { write } from '../lib';
import { getDistributionDefaults } from '../lib/distribution_defaults';

export const CreateDistributionDefaults: Task = {
  description: 'Creating distribution configuration defaults',
  async run(config, log, build) {
    for (const platform of config.getTargetPlatforms()) {
      const { kibana, nodeOptions, nodeEnvironment } = getDistributionDefaults(platform);
      if (
        !Object.keys(kibana).length &&
        !nodeOptions.length &&
        !Object.keys(nodeEnvironment).length
      ) {
        continue;
      }
      const defaultsPath = (...paths: string[]) =>
        build.resolvePathForPlatform(platform, 'config_defaults', ...paths);

      await write(defaultsPath('kibana.yml'), stringify(kibana));
      await write(defaultsPath('node.options'), `${nodeOptions.join('\n')}\n`);
      await write(
        defaultsPath('node_env.sh'),
        Object.entries(nodeEnvironment)
          .map(([name, path]) => {
            if (
              !/^[A-Z_][A-Z0-9_]*$/.test(name) ||
              !/^[a-zA-Z0-9_/.-]+$/.test(path) ||
              path.includes('..') ||
              path.startsWith('/')
            ) {
              throw new Error(`Invalid distribution environment default: ${name}=${path}`);
            }
            return `export ${name}="$KBN_DISTRIBUTION_ROOT/${path}"\n`;
          })
          .join('')
      );
    }
  },
};
