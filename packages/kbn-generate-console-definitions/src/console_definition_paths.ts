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

export const CONSOLE_DEFINITIONS_FOLDER = Path.resolve(
  REPO_ROOT,
  'src/platform/plugins/shared/console/server/lib/spec_definitions/json'
);
export const GENERATED_SUBFOLDER = 'generated';
export const OVERRIDES_SUBFOLDER = 'overrides';
