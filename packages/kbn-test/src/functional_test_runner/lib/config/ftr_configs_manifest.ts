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
import JsYaml from 'js-yaml';

const ftrConfigsManifestsSourcePath = Path.resolve(REPO_ROOT, './ftr_configs_manifests.json');
const ftrManifests: {
  serverless: string[];
  stateful: string[];
} = JSON.parse(Fs.readFileSync(ftrConfigsManifestsSourcePath, 'utf8'));
export const ALL_FTR_MANIFEST_REL_PATHS = ftrManifests.stateful.concat(ftrManifests.serverless);

interface FtrConfigWithOptions {
  [configPath: string]: {
    queue: string;
  };
}

interface FtrConfigsManifest {
  defaultQueue: string;
  disabled: string[];
  enabled: Array<string | FtrConfigWithOptions>;
}

const ftrConfigsManifest: FtrConfigsManifest = { enabled: [], disabled: [], defaultQueue: '' };

for (const manifestRelPath of ALL_FTR_MANIFEST_REL_PATHS) {
  const partialFtrConfigsManifest: FtrConfigsManifest = JsYaml.safeLoad(
    Fs.readFileSync(Path.resolve(REPO_ROOT, manifestRelPath), 'utf8')
  );
  // merge enabled and disabled configs from multiple manifests
  ftrConfigsManifest.enabled.concat(partialFtrConfigsManifest.enabled);
  ftrConfigsManifest.disabled.concat(partialFtrConfigsManifest.disabled);
}

export const FTR_CONFIGS_MANIFEST_PATHS = [
  Object.values(ftrConfigsManifest.enabled),
  Object.values(ftrConfigsManifest.disabled),
]
  .flat()
  .map((config) => {
    const rel = typeof config === 'string' ? config : Object.keys(config)[0];
    return Path.resolve(REPO_ROOT, rel);
  });
