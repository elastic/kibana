/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from '@kbn/repo-info';

const localBundles = Path.resolve(__dirname, './target_workers');
const bazelBundles = Path.resolve(REPO_ROOT, 'bazel-bin', Path.relative(REPO_ROOT, localBundles));

// extracted const vars
export const bundleDir = Fs.existsSync(localBundles) ? localBundles : bazelBundles;
