/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TsProjectRule } from '@kbn/repo-linter';

export const requiredFileSelectors = TsProjectRule.create('requiredFileSelectors', {
  check({ tsProject }) {
    if (tsProject.config.files || !tsProject.config.include) {
      return {
        msg: 'every ts project must use the "include" key (and not the "files" key) to select the files for that project',
      };
    }
  },
});
