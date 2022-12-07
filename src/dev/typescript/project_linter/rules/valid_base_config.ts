/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError } from '@kbn/dev-cli-errors';

import { Rule } from '../lib/rule';
import { LintProject, TsConfig } from '../lib/lint_project';

function getBaseConfigRels(path: string, config: TsConfig, cache: Map<string, string[]>): string[] {
  const cached = cache.get(path);
  if (cached) {
    return cached;
  }

  if (!config.extends) {
    return [];
  }

  const abs = Path.resolve(Path.dirname(path), config.extends);
  let baseConfig;
  try {
    baseConfig = LintProject.parseConfig(abs);
  } catch (error) {
    throw createFailError(
      `unable to load base tsconfig of ${Path.relative(process.cwd(), path)}: ${error.message}`
    );
  }

  const rels = [Path.relative(REPO_ROOT, abs), ...getBaseConfigRels(abs, baseConfig, cache)];
  cache.set(path, rels);
  return rels;
}

export const validBaseConfig = Rule.create('validBaseConfig', {
  check(proj) {
    const cache = this.getCache(() => new Map<string, string[]>());
    const baseConfigRels = getBaseConfigRels(proj.path, proj.config, cache);

    if (baseConfigRels[0] === 'tsconfig.json') {
      return `This tsconfig extends the root tsconfig.json file and shouldn't. The root tsconfig.json file is not a valid base config, you probably want to point to the tsconfig.base.json file.`;
    }

    const configRel = Path.relative(REPO_ROOT, proj.path);
    if (configRel !== 'tsconfig.base.json' && !baseConfigRels.includes('tsconfig.base.json')) {
      return `This tsconfig does not extend the tsconfig.base.json file either directly or indirectly. The TS config setup for the repo expects every tsconfig file to extend this base config file.`;
    }
  },
});
