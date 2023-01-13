/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TsProjectRule } from '@kbn/repo-linter';

import { forbiddenCompilerOptions } from './forbidden_compiler_options';
import { refPkgsIds } from './reference_pkg_ids';
import { requiredCompilerOptions } from './required_compiler_options';
import { validBaseTsconfig } from './valid_base_tsconfig';
import { requiredExcludes } from './required_excludes';
import { requiredFileSelectors } from './required_file_selectors';
import { referenceUsedPkgs } from './reference_used_pkgs';
import { tsconfigIndentation } from './tsconfig_indentation';

export const RULES: TsProjectRule[] = [
  forbiddenCompilerOptions,
  refPkgsIds,
  requiredCompilerOptions,
  validBaseTsconfig,
  requiredExcludes,
  requiredFileSelectors,
  referenceUsedPkgs,
  tsconfigIndentation,
];
