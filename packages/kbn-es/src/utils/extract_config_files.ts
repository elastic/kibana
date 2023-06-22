/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Copies config references to an absolute path to
 * the provided destination. This is necessary as ES security
 * requires files to be within the installation directory
 */
export function extractConfigFiles(
  config: string | string[],
  dest: string,
  options?: { log: ToolingLog }
) {
  const originalConfig = typeof config === 'string' ? [config] : config;
  const localConfig: string[] = [];

  originalConfig.forEach((prop) => {
    const [key, value] = prop.split('=');

    if (isFile(value)) {
      const filename = path.basename(value);
      const destPath = path.resolve(dest, 'config', filename);
      copyFileSync(value, destPath);

      options?.log.info('moved %s in config to %s', value, destPath);

      localConfig.push(`${key}=${filename}`);
    } else {
      localConfig.push(prop);
    }
  });

  return localConfig;
}

function isFile(dest = '') {
  return path.isAbsolute(dest) && path.extname(dest).length > 0 && fs.existsSync(dest);
}

function copyFileSync(src: string, dest: string) {
  const destPath = path.dirname(dest);

  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  fs.writeFileSync(dest, fs.readFileSync(src));
}
