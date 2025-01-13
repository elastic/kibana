/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { TsProject } from '@kbn/ts-projects';
import { setExtends } from '@kbn/json-ast';

import { TsProjectRule } from '@kbn/repo-linter';

function getBaseConfigRels(proj: TsProject): string[] {
  const base = proj.getBase();
  if (!base) {
    return [];
  }
  return [base.repoRel, ...getBaseConfigRels(base)];
}

export const validBaseTsconfig = TsProjectRule.create('validBaseTsconfig', {
  check({ tsProject }) {
    const configRel = Path.relative(REPO_ROOT, tsProject.path);
    if (configRel !== 'tsconfig.base.json' && !tsProject.config.extends) {
      return {
        msg: `This tsconfig requires an "extends" setting`,
        fixes: {
          'tsconfig.json': (source) =>
            setExtends(
              source,
              Path.relative(tsProject.directory, Path.resolve(REPO_ROOT, 'tsconfig.base.json'))
            ),
        },
      };
    }

    const baseConfigRels = getBaseConfigRels(tsProject);
    if (baseConfigRels[0] === 'tsconfig.json') {
      return `This tsconfig extends the root tsconfig.json file and shouldn't. The root tsconfig.json file is not a valid base config, you probably want to point to the tsconfig.base.json file.`;
    }

    if (configRel !== 'tsconfig.base.json' && !baseConfigRels.includes('tsconfig.base.json')) {
      return `This tsconfig does not extend the tsconfig.base.json file either directly or indirectly. The TS config setup for the repo expects every tsconfig file to extend this base config file.`;
    }
  },
});
