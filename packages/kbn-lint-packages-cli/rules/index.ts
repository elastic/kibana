/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PackageRule } from '@kbn/repo-linter';

import { matchingPackageNameRule } from './matching_package_name';
import { noBasenameCollisionsRule } from './no_basename_collisions';

export const RULES: PackageRule[] = [matchingPackageNameRule, noBasenameCollisionsRule];
