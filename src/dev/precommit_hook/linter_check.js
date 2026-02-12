/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SimpleGit from 'simple-git';
import { REPO_ROOT } from '@kbn/repo-info';
import { PrecommitCheck } from './precommit_check';

export class LinterCheck extends PrecommitCheck {
  constructor(name, linter) {
    super(name);
    this.linter = linter;
  }

  async execute(log, allFiles, options) {
    const nonDeletedFiles = allFiles.filter((f) => f.getGitStatus() !== 'deleted');
    const filesToLint = await this.linter.pickFilesToLint(log, nonDeletedFiles);
    if (filesToLint.length > 0) {
      await this.linter.lintFiles(log, filesToLint, {
        fix: options.fix,
      });

      if (options.fix && options.stage) {
        const simpleGit = new SimpleGit(REPO_ROOT);
        await simpleGit.add(filesToLint);
      }
    }
  }
}
