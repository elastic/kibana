/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';

export const ROOT_PKG_DIR = Path.resolve(REPO_ROOT, 'packages');
export const TEMPLATE_DIR = Path.resolve(__dirname, '../templates');
export const PKG_TEMPLATE_DIR = Path.resolve(TEMPLATE_DIR, 'package');
