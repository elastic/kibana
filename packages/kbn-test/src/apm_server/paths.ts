/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/dev-utils';

const DATA_DIR = Path.resolve(REPO_ROOT, 'data/test-apm-server');

export const INSTALLS_DIR = Path.resolve(DATA_DIR, 'installs');
export const ARCHIVES_DIR = Path.resolve(DATA_DIR, 'archives');
export const STAGING_DIR = Path.resolve(ARCHIVES_DIR, 'staging');
