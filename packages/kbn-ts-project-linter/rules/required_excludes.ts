/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Rule } from '../lib/rule';
import { setExclude } from '../ast';

const REQUIRED_EXCLUDES = ['target/**/*'];

function isEql(required: string, existing: string) {
  if (required !== 'target/**/*') {
    return false;
  }

  const normal = existing.startsWith('./') ? existing.slice(2) : existing;
  return normal === 'target' || normal.startsWith('target/');
}

export const requiredExcludes = Rule.create('requiredExcludes', {
  check(project) {
    const existing = project.config.exclude;
    if (!existing) {
      return {
        msg: `excludes must be defined and include "${REQUIRED_EXCLUDES.join('", "')}"`,
        fix: (source) => setExclude(source, REQUIRED_EXCLUDES),
      };
    }

    const missing = REQUIRED_EXCLUDES.filter((re) => !existing.includes(re));
    if (missing.length) {
      return {
        msg: `excludes must include "${REQUIRED_EXCLUDES.join('", "')}"`,
        fix: (source) =>
          setExclude(source, [
            ...existing.filter((e) => !missing.some((r) => isEql(r, e))),
            ...missing,
          ]),
      };
    }
  },
});
