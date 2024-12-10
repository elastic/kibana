/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { resolve } from 'path';
import { readFileSync } from 'fs';

import { REPO_ROOT } from '@kbn/repo-info';
import { RenovatePackageRule, ruleFilter, packageFilter } from './rule';

export const parseConfig = (() => {
  let cache: {
    renovateRules: RenovatePackageRule[];
    packageDependencies: string[];
    packageDevDependencies: string[];
  } | null = null;

  return () => {
    if (cache) {
      return cache;
    }

    const renovateFile = resolve(REPO_ROOT, 'renovate.json');
    const packageFile = resolve(REPO_ROOT, 'package.json');

    const renovateConfig = JSON.parse(readFileSync(renovateFile, 'utf8'));
    const packageConfig = JSON.parse(readFileSync(packageFile, 'utf8'));

    const renovateRules = (renovateConfig?.packageRules || []).filter(ruleFilter);
    const packageDependencies = Object.keys(packageConfig?.dependencies || {}).filter(
      packageFilter
    );
    const packageDevDependencies = Object.keys(packageConfig?.devDependencies || {}).filter(
      packageFilter
    );

    cache = { renovateRules, packageDependencies, packageDevDependencies };
    return cache;
  };
})();
