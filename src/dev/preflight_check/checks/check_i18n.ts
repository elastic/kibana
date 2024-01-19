/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  checkCompatibility,
  checkConfigs,
  extractDefaultMessages,
  extractUntrackedMessages,
  mergeConfigs,
} from '../../i18n/tasks';
import { PreflightCheck, TestResponse } from './preflight_check';

export class I18nCheck extends PreflightCheck {
  id = 'i18n';

  public async runCheck() {
    const files = Array.from(this.files.values());
    const response: TestResponse = { test: this.id, errors: [] };

    if (files.length === 0) {
      return response;
    }

    const paths = files.map(({ path }) => path);

    const srcPaths = Array().concat(paths);

    const config = {
      paths: {},
      exclude: [],
      translations: [],
      prefix: '',
    };

    checkConfigs();
    mergeConfigs();
    extractUntrackedMessages(srcPaths);
    extractDefaultMessages(config, srcPaths);
    checkCompatibility(
      config,
      {
        fix: Boolean(this.flags.fix),
        ignoreIncompatible: false,
        ignoreMalformed: false,
        ignoreMissing: false,
        ignoreUnused: false,
      },
      this.log
    );

    return response;
  }
}
