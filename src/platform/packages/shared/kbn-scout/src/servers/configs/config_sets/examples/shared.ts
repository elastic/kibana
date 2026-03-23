/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { findTestPluginPaths } from '@kbn/test';

/**
 * Server args aligned with x-pack/platform/test/examples/config.ts so developer
 * example plugins (and their cross-dependencies) load via --plugin-path.
 */
export const examplesServerArgs = [
  '--data.search.sessions.enabled=true',
  ...findTestPluginPaths([resolve(REPO_ROOT, 'examples'), resolve(REPO_ROOT, 'x-pack/examples')]),
];
