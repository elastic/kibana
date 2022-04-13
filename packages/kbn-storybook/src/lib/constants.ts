/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { REPO_ROOT as KIBANA_ROOT } from '@kbn/utils';

export const REPO_ROOT = KIBANA_ROOT;
export const ASSET_DIR = resolve(KIBANA_ROOT, 'built_assets/storybook');
