/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';

import dedent from 'dedent';

import type { ManagedConfigKey } from '@kbn/managed-vscode-config';
import { updateVscodeConfig } from '@kbn/managed-vscode-config';

const INFO_TEXT = dedent`
  Some settings in this file are managed by @kbn/dev-utils. When a setting is managed it is preceeded
  with a comment "// @managed" comment. Replace that with "// self managed" and the scripts will not
  touch that value. Put a "// self managed" comment at the top of the file, or above a group of settings
  to disable management of that entire section.
`;

const readConfig = async (path: string): Promise<string | undefined> => {
  try {
    return await Fsp.readFile(path, 'utf-8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

/** Writes the managed `keys` into the VSCode config file at `path`, creating it if missing. */
export const updateConfigFile = async (path: string, keys: ManagedConfigKey[]): Promise<void> => {
  const updatedJson = await updateVscodeConfig(keys, INFO_TEXT, await readConfig(path));
  await Fsp.writeFile(path, updatedJson);
};
