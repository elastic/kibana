/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PrecommitCheck } from './precommit_check';
import { checkSemverRanges } from '../no_pkg_semver_ranges';

export class SemverRangesCheck extends PrecommitCheck {
  constructor() {
    super('Semver Ranges');
  }

  async execute(log, files, options) {
    log.verbose('Checking for semver ranges in package.json');

    try {
      const result = checkSemverRanges({ fix: options.fix });
      if (result.totalFixes > 0) {
        log.info(`Fixed ${result.totalFixes} semver ranges in package.json`);
      }
    } catch (error) {
      throw error;
    }
  }
}
