/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setProp } from '@kbn/json-ast';

import { TsProjectRule } from '@kbn/repo-linter';

const REQUIRED_EXCLUDES = ['target/**/*'];

export const requiredExcludes = TsProjectRule.create('requiredExcludes', {
  check({ tsProject }) {
    const existing = tsProject.config.exclude;
    if (!existing) {
      return {
        msg: `excludes must be defined and include "${REQUIRED_EXCLUDES.join('", "')}"`,
        fixes: {
          'tsconfig.json': (source) => setProp(source, 'exclude', REQUIRED_EXCLUDES),
        },
      };
    }

    const missing = REQUIRED_EXCLUDES.filter((re) => !existing.includes(re));
    if (missing.length) {
      return {
        msg: `excludes must include "${REQUIRED_EXCLUDES.join('", "')}"`,
        fixes: {
          'tsconfig.json': (source) =>
            setProp(source, 'exclude', [
              ...(missing.includes('target/**/*')
                ? existing.filter((e) => {
                    const normalized = e.startsWith('./') ? e.slice(2) : e;
                    return normalized === 'target' || normalized.startsWith('target/');
                  })
                : existing),
              ...missing,
            ]),
        },
      };
    }
  },
});
