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

export const FTR_CONFIGS_MANIFEST_REL = '.buildkite/ftr_configs.yml';

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
let ftrConfigsManifest: FtrConfigsManifest;

listAffectedDirectories(REPO_ROOT);

const load = (x: string): FtrConfigsManifest => JsYaml.safeLoad(Fs.readFileSync(x, 'utf8'));
try {
  const ftrManifestPath = Path.resolve(REPO_ROOT, FTR_CONFIGS_MANIFEST_REL);
  // eslint-disable-next-line no-console
  console.log('### Loading ftr manifest...', {
    ftrManifestPath,
    REPO_ROOT,
    FTR_CONFIGS_MANIFEST_REL,
  });
  ftrConfigsManifest = load(Path.resolve(REPO_ROOT, FTR_CONFIGS_MANIFEST_REL));
} catch (_) {
  const abnormalPath = Path.resolve(REPO_ROOT, '../kibana', FTR_CONFIGS_MANIFEST_REL);
  // eslint-disable-next-line no-console
  console.error(`\n### Could not load ${FTR_CONFIGS_MANIFEST_REL} normally,
(meaning we could not load it from ${REPO_ROOT}),
Error: \n  ${_},
Now we'll try to load it from ${abnormalPath}`);
  try {
    ftrConfigsManifest = load(abnormalPath);
  } catch (e) {
    throw new Error(`\n### Could not load ${abnormalPath} either, Error: \n  ${e}`);
  }
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

function listAffectedDirectories(repoRoot: string) {
  try {
    const buildkiteDir = Path.resolve(repoRoot, '.buildkite');
    const buildkiteDirContents = !Fs.existsSync(buildkiteDir)
      ? '<doesnt-exist>'
      : Fs.readdirSync(buildkiteDir).join('; ');

    const alternativeKibanaPath = Path.resolve(repoRoot, '../kibana', '.buildkite');
    const alternativeKibanaBuildkiteDirContents = !Fs.existsSync(buildkiteDir)
      ? '<doesnt-exist>'
      : Fs.readdirSync(alternativeKibanaPath).join('; ');

    // eslint-disable-next-line no-console
    console.log('### Dir contents to discover structure', {
      [buildkiteDir]: buildkiteDirContents,
      [alternativeKibanaPath]: alternativeKibanaBuildkiteDirContents,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('### Error while listing buildkite-related directories', e);
  }
}
