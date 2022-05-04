/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from '@kbn/utils';
import JsYaml from 'js-yaml';

export const FTR_CONFIGS_MANIFEST_REL = '.buildkite/ftr_configs.yml';

const ftrConfigsManifest = JsYaml.safeLoad(
  Fs.readFileSync(Path.resolve(REPO_ROOT, FTR_CONFIGS_MANIFEST_REL), 'utf8')
);

export const FTR_CONFIGS_MANIFEST_PATHS = (Object.values(ftrConfigsManifest) as string[][])
  .flat()
  .map((rel) => Path.resolve(REPO_ROOT, rel));
