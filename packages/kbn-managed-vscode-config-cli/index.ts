/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { REPO_ROOT } from '@kbn/repo-info';

import { run } from '@kbn/dev-cli-runner';

import {
  MANAGED_CONFIG_KEYS,
  MANAGED_CONFIG_FILES,
  MANAGED_EXTENSIONS_KEYS,
} from '@kbn/managed-vscode-config';

import { updateConfigFile } from './src/update_config_file';

const CONFIG_DIR = Path.resolve(REPO_ROOT, '.vscode');

run(async ({ log }) => {
  await Fsp.mkdir(CONFIG_DIR, { recursive: true });

  // write managed config files
  for (const { name, content } of MANAGED_CONFIG_FILES) {
    await Fsp.writeFile(Path.resolve(CONFIG_DIR, name), content);
  }

  for (const [name, keys] of [
    ['settings.json', MANAGED_CONFIG_KEYS],
    ['extensions.json', MANAGED_EXTENSIONS_KEYS],
  ] as const) {
    const path = Path.resolve(CONFIG_DIR, name);
    await updateConfigFile(path, keys);
    log.success('updated', path);
  }
});
