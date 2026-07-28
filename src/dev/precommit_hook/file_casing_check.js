/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PrecommitCheck } from './precommit_check';
import { runFileCasingCheck } from './run_file_casing_check';

export class FileCasingCheck extends PrecommitCheck {
  constructor() {
    super('File Casing');
  }

  shouldExecute() {
    return !process.env.SKIP_CASING_CHECK?.match(/(1|true)/);
  }

  async execute(log, allFiles) {
    const files = allFiles.filter((f) => f.getGitStatus() !== 'deleted');
    await runFileCasingCheck(log, files);
  }
}
