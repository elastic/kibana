/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import inquirer from 'inquirer';

import { Plugin } from './load_kibana_platform_plugin';

export async function resolveKibanaVersion(option: string | undefined, plugin: Plugin) {
  const preselectedVersion = option || plugin.manifest.kibanaVersion || plugin.manifest.version;

  if (preselectedVersion && preselectedVersion !== 'kibana') {
    return preselectedVersion;
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'kibanaVersion',
      message: 'What version of Kibana are you building for?',
    },
  ]);

  return answers.kibanaVersion;
}
