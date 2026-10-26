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
import type { TsProject } from '@kbn/ts-projects';
import { setExtends } from '@kbn/json-ast';

import { TsProjectRule } from '@kbn/repo-linter';

function getBaseConfigRels(proj: TsProject): string[] {
  const base = proj.getBase();
  if (!base) {
    return [];
  }
  if (base.repoRel === proj.repoRel) {
    throw new Error(`Detected circular tsconfig extends reference at ${proj.repoRel}`);
  }
  return [base.repoRel, ...getBaseConfigRels(base)];
}

function projectNeedsDirectReference(proj: TsProject) {
  const exceptionList = [
    // .buildkite might be bootstrapped without the rest of the repo, cannot use a package reference
    '.buildkite/tsconfig.json',
    // this is the shortcut package, it cannot reference itself
    'packages/kbn-tsconfig/base/tsconfig.json',
  ];

  return exceptionList.some((exception) => proj.repoRel === exception);
}

const KBN_TSCONFIG_BASE_REF = '@kbn/tsconfig-base/tsconfig.json';
const isKbnTsconfigBaseInstalled = (() => {
  let _isKbnTsconfigBaseInstalled: boolean | null = null;
  return () => {
    if (_isKbnTsconfigBaseInstalled !== null) {
      return _isKbnTsconfigBaseInstalled;
    } else {
      try {
        require.resolve(KBN_TSCONFIG_BASE_REF, { paths: [REPO_ROOT] });
        _isKbnTsconfigBaseInstalled = true;
      } catch {
        _isKbnTsconfigBaseInstalled = false;
      }
      return _isKbnTsconfigBaseInstalled;
    }
  };
})();

const BASE_TSCONFIG_NAME = 'tsconfig.base.json';

export const validBaseTsconfig = TsProjectRule.create('validBaseTsconfig', {
  check({ tsProject }) {
    const projectTsconfigPath = Path.relative(REPO_ROOT, tsProject.path);
    const packageRelativeTsconfigBasePath = Path.relative(
      tsProject.directory,
      Path.resolve(REPO_ROOT, BASE_TSCONFIG_NAME)
    );

    // Since https://github.com/elastic/kibana/pull/217159 we prefer package-referenced base extends
    const desiredExtendsTarget =
      isKbnTsconfigBaseInstalled() && !projectNeedsDirectReference(tsProject)
        ? KBN_TSCONFIG_BASE_REF
        : packageRelativeTsconfigBasePath;

    const isRootBaseTsconfig = projectTsconfigPath === BASE_TSCONFIG_NAME;
    const hasExtendsField = !!tsProject.config.extends;
    if (!isRootBaseTsconfig) {
      if (!hasExtendsField) {
        return {
          msg: `This tsconfig requires an "extends" setting`,
          fixes: {
            'tsconfig.json': (source) => setExtends(source, desiredExtendsTarget),
          },
        };
      } else if (
        projectNeedsDirectReference(tsProject) &&
        tsProject.config.extends !== packageRelativeTsconfigBasePath
      ) {
        return {
          msg: `This tsconfig requires a direct reference to the "${BASE_TSCONFIG_NAME}"`,
          fixes: {
            'tsconfig.json': (source) => setExtends(source, packageRelativeTsconfigBasePath),
          },
        };
      } else if (
        tsProject.config.extends !== desiredExtendsTarget &&
        tsProject.config.extends === packageRelativeTsconfigBasePath // this ensures we can still do custom extends
      ) {
        return {
          msg: `This tsconfig uses a relative extends path on ${BASE_TSCONFIG_NAME}, but it should extend "${KBN_TSCONFIG_BASE_REF}"`,
          fixes: {
            'tsconfig.json': (source) => setExtends(source, desiredExtendsTarget),
          },
        };
      }
    }

    const baseConfigRels = getBaseConfigRels(tsProject);
    if (baseConfigRels[0] === 'tsconfig.json') {
      return `This tsconfig extends the root tsconfig.json file and shouldn't. The root tsconfig.json file is not a valid base config, you probably want to point to the tsconfig.base.json file.`;
    }

    if (!isRootBaseTsconfig && !baseConfigRels.includes(BASE_TSCONFIG_NAME)) {
      return `This tsconfig does not extend the ${BASE_TSCONFIG_NAME} file either directly or indirectly. The TS config setup for the repo expects every tsconfig file to extend this base config file.`;
    }
  },
});
