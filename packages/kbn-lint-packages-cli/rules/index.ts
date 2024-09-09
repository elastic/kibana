/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PackageRule } from '@kbn/repo-linter';

import { matchingPackageNameRule } from './matching_package_name';
import { constantVersionRule } from './constant_version';
import { noLicenseRule } from './no_license';
import { noBasenameCollisionsRule } from './no_basename_collisions';

export const RULES: PackageRule[] = [
  matchingPackageNameRule,
  constantVersionRule,
  noLicenseRule,
  noBasenameCollisionsRule,
];
