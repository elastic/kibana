/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';
import Path from 'path';
import Fs from 'fs';
import { execSync } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';
import JsYaml from 'js-yaml';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

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

// eslint-disable-next-line no-console
console.log(`REPO_ROOT: ${REPO_ROOT}`);
// eslint-disable-next-line no-console
console.log(`cwd: ${process.cwd()}`);

ls('.');
ls(REPO_ROOT);
// REPO_ROOT: /var/lib/buildkite-agent/builds/kb-n2-4-spot-816c5d0c23ef2bc6/elastic/kibana-pull-request/kibana
// cwd:       /var/lib/buildkite-agent/builds/kb-n2-4-spot-816c5d0c23ef2bc6/elastic/kibana-pull-request/kibana
ls(`${REPO_ROOT}/.buildkite`);
// ls(
//   '/var/lib/buildkite-agent/builds/kb-n2-4-spot-8d94c28da2235528/elastic/kibana-pull-request/kibana-build-xpack/'
// );
// ls(
//   '/var/lib/buildkite-agent/builds/kb-n2-4-spot-8d94c28da2235528/elastic/kibana-pull-request/kibana-build-xpack/.buildkite/'
// );

// const paths = [
//   REPO_ROOT,
//   `${REPO_ROOT}/.buildkite`,
// ]

const parentDir = (x: string) => execSync(`dirname ${x}`, { cwd: REPO_ROOT, encoding: 'utf8' });
let repoRootParent;

// eslint-disable-next-line no-console
console.log('\n--- Show some path info!');

try {
  repoRootParent = parentDir(REPO_ROOT);
  // eslint-disable-next-line no-console
  console.log(`\n### repoRootParent: \n  ${repoRootParent}`);
} catch (e) {
  // eslint-disable-next-line no-console
  console.error(`\n### Error looking at paths e: \n  ${e}`);
}

async function ls(dir: string) {
  try {
    const { stdout } = await execa('ls', ['-la', dir]);
    // eslint-disable-next-line no-console
    console.log(`--- ls of ${dir}`);
    // eslint-disable-next-line no-console
    console.log(`ls ${dir}:\n${stdout}\n`);
    // eslint-disable-next-line no-console
    console.log(`### END ls of ${dir}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(`ls ${dir}: ERROR: ${e}`);
  }
}

const loadManifest = (a: string, b: string) => () =>
  JsYaml.safeLoad(Fs.readFileSync(Path.resolve(a, b), 'utf8'));
const manifest = (root: string, configsRelativePath: string) =>
  E.tryCatch(loadManifest(root, configsRelativePath), E.toError);
const ftrConfigsManifest: FtrConfigsManifest = pipe(
  manifest(REPO_ROOT, FTR_CONFIGS_MANIFEST_REL),
  E.fold(
    (_: any) => ({} as FtrConfigsManifest),
    (x: FtrConfigsManifest) => x
  )
);
export const FTR_CONFIGS_MANIFEST_PATHS = [
  Object.values(ftrConfigsManifest.enabled),
  Object.values(ftrConfigsManifest.disabled),
]
  .flat()
  .map((config) => {
    const rel = typeof config === 'string' ? config : Object.keys(config)[0];
    return Path.resolve(REPO_ROOT, rel);
  });
