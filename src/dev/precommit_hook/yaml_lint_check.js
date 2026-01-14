/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile } from 'fs/promises';
import { load as yamlLoad } from 'js-yaml';
import { PrecommitCheck } from './precommit_check';

export class YamlLintCheck extends PrecommitCheck {
  constructor() {
    super('YAML Lint');
  }

  async execute(log, files) {
    const yamlFiles = files.filter((file) => file.isYaml() && file.getGitStatus() !== 'deleted');

    if (yamlFiles.length === 0) {
      log.verbose('No YAML files to check');
      return;
    }

    log.verbose(`Checking ${yamlFiles.length} YAML files for syntax errors`);

    const errors = [];
    for (const file of yamlFiles) {
      try {
        const content = await readFile(file.getAbsolutePath(), 'utf8');
        yamlLoad(content, {
          filename: file.getRelativePath(),
        });
      } catch (error) {
        errors.push(`Error in ${file.getRelativePath()}:\n${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n\n'));
    }
  }
}
