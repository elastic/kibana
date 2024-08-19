/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from '@kbn/repo-info';
import JsYaml from 'js-yaml';

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

const FTR_CONFIGS_MANIFEST_SOURCE_REL = '.buildkite/ftr_configs_manifests.json';

const getAllFtrConfigsManifests = () => {
  const ftrConfigsManifestsSourcePath = Path.resolve(REPO_ROOT, FTR_CONFIGS_MANIFEST_SOURCE_REL);
  const manifestPaths: {
    serverless: string[];
    stateful: string[];
  } = JSON.parse(Fs.readFileSync(ftrConfigsManifestsSourcePath, 'utf8'));
  return {
    stateful: manifestPaths.stateful,
    serverless: manifestPaths.serverless,
    all: manifestPaths.stateful.concat(manifestPaths.serverless),
  };
};

export const getAllFtrConfigsAndManifests = () => {
  const manifestPaths = getAllFtrConfigsManifests();
  const allFtrConfigs: string[] = [];

  for (const manifestRelPath of manifestPaths.all) {
    const manifest: FtrConfigsManifest = JsYaml.load(
      Fs.readFileSync(Path.resolve(REPO_ROOT, manifestRelPath), 'utf8')
    );

    const ftrConfigsInManifest = [
      Object.values(manifest.enabled ?? []),
      Object.values(manifest.disabled ?? []),
    ]
      .flat()
      .map((config) => {
        const rel = typeof config === 'string' ? config : Object.keys(config)[0];
        return Path.resolve(REPO_ROOT, rel);
      });

    allFtrConfigs.push(...ftrConfigsInManifest);
  }

  return { allFtrConfigs, manifestPaths };
};
