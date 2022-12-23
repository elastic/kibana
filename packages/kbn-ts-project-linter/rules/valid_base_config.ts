/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { Project } from '@kbn/ts-projects';

import { Rule } from '../lib/rule';

function getBaseConfigRels(proj: Project): string[] {
  const base = proj.getBase();
  if (!base) {
    return [];
  }
  return [base.repoRel, ...getBaseConfigRels(base)];
}

export const validBaseConfig = Rule.create('validBaseConfig', {
  check(proj) {
    const baseConfigRels = getBaseConfigRels(proj);

    if (baseConfigRels[0] === 'tsconfig.json') {
      return `This tsconfig extends the root tsconfig.json file and shouldn't. The root tsconfig.json file is not a valid base config, you probably want to point to the tsconfig.base.json file.`;
    }

    const configRel = Path.relative(REPO_ROOT, proj.path);
    if (configRel !== 'tsconfig.base.json' && !baseConfigRels.includes('tsconfig.base.json')) {
      return `This tsconfig does not extend the tsconfig.base.json file either directly or indirectly. The TS config setup for the repo expects every tsconfig file to extend this base config file.`;
    }
  },
});
