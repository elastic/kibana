/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs/promises';

import { REPO_ROOT } from '@kbn/utils';
import dedent from 'dedent';

import { run } from '../run';

import { MANAGED_CONFIG_KEYS } from './managed_config_keys';
import { updateVscodeConfig } from './update_vscode_config';

export function runUpdateVscodeConfigCli() {
  run(async ({ log }) => {
    const path = Path.resolve(REPO_ROOT, '.vscode/settings.json');

    let json;
    try {
      json = await Fs.readFile(path, 'utf-8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    const updatedJson = updateVscodeConfig(
      MANAGED_CONFIG_KEYS,
      dedent`
        Some settings in this file are managed by @kbn/dev-utils. When a setting is managed it is preceeded
        with a comment "// @managed" comment. Replace that with "// self managed" and the scripts will not
        touch that value. Put a "// self managed" comment at the top of the file, or above a group of settings
        to disable management of that entire section.
      `,
      json
    );
    await Fs.mkdir(Path.dirname(path), { recursive: true });
    await Fs.writeFile(path, updatedJson);

    log.success('updated', path);
  });
}
