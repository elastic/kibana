/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  cli,
  type VisualRegressionManifest,
  type VisualRegressionRunManifest,
} from '@kbn/scout-vrt';
import {
  buildMainBaselineRunPlan,
  createVisualBaselineBundleArchivePath,
  createVisualBaselineBundles,
  createVisualBaselineCatalog,
  type ModuleDiscoveryInfo,
  type PlannedVisualBaselineRunGroup,
} from './main_baseline_publisher';
import { getKibanaDir } from '#pipeline-utils';

const BASELINES_BUCKET = 'ci-artifacts.kibana.dev/vrt/baselines/main';
const CONFIG_DISCOVERY_PATH = path.join(
  REPO_ROOT,
  '.scout',
  'test_configs',
  'scout_playwright_configs.json'
);
const LOCAL_BASELINES_ROOT = path.join(REPO_ROOT, '.scout', 'baselines', 'vrt');
const LOCAL_VRT_RUNS_ROOT = path.join(REPO_ROOT, '.scout', 'test-artifacts', 'vrt');

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable '${name}'`);
  }

  return value;
};

const exec = (file: string, args: string[], env?: Record<string, string>) => {
  execFileSync(file, args, {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  });
};

const runNodeScript = (scriptPath: string, args: string[], env?: Record<string, string>) => {
  exec(process.execPath, [scriptPath, ...args], env);
};

const ensureScoutConfigDiscovery = () => {
  console.log('--- Updating Scout config manifests for VRT baseline publishing');
  runNodeScript(path.join(REPO_ROOT, 'scripts', 'scout.js'), [
    'update-test-config-manifests',
    '--concurrencyLimit',
    '3',
  ]);

  console.log('--- Discovering Scout Playwright configs for VRT baseline publishing');
  runNodeScript(path.join(REPO_ROOT, 'scripts', 'scout.js'), [
    'discover-playwright-configs',
    '--include-custom-servers',
    '--save',
  ]);
};

const readModuleDiscoveryInfo = (): ModuleDiscoveryInfo[] => {
  return JSON.parse(fs.readFileSync(CONFIG_DISCOVERY_PATH, 'utf8')) as ModuleDiscoveryInfo[];
};

const readJsonFile = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;

const getRunManifestPath = (runId: string): string =>
  path.join(LOCAL_VRT_RUNS_ROOT, runId, 'manifest.json');
const getPackageManifestPath = (runId: string, packageId: string): string =>
  path.join(LOCAL_VRT_RUNS_ROOT, runId, 'test-artifacts', packageId, 'manifest.json');

const createBundleArchive = (publishRoot: string, relativePath: string): string => {
  const archivePath = path.join(publishRoot, createVisualBaselineBundleArchivePath(relativePath));
  fs.mkdirSync(path.dirname(archivePath), { recursive: true });
  execFileSync('tar', ['-czf', archivePath, '-C', publishRoot, relativePath], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  return archivePath;
};

const stageBundles = (runManifests: VisualRegressionRunManifest[], commitSha: string): string => {
  const publishRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kibana-vrt-main-baselines-'));
  const generatedAt = new Date().toISOString();
  const bundles = runManifests.flatMap((runManifest) => {
    const packageManifests = runManifest.packages.map(({ packageId }) =>
      readJsonFile<VisualRegressionManifest>(getPackageManifestPath(runManifest.runId, packageId))
    );

    return createVisualBaselineBundles(runManifest, packageManifests);
  });

  for (const bundle of bundles) {
    const bundleRoot = path.join(publishRoot, bundle.relativePath);
    fs.mkdirSync(bundleRoot, { recursive: true });
    fs.writeFileSync(
      path.join(bundleRoot, 'manifest.json'),
      JSON.stringify(bundle.runManifest, null, 2)
    );

    for (const packageManifest of bundle.packageManifests) {
      const packageManifestPath = path.join(bundleRoot, packageManifest.packageId, 'manifest.json');
      fs.mkdirSync(path.dirname(packageManifestPath), { recursive: true });
      fs.writeFileSync(packageManifestPath, JSON.stringify(packageManifest, null, 2));
    }

    for (const imagePath of bundle.imagePaths) {
      const sourcePath = path.join(LOCAL_BASELINES_ROOT, imagePath);
      const destinationPath = path.join(bundleRoot, imagePath);

      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
    }

    createBundleArchive(publishRoot, bundle.relativePath);
  }

  const catalog = createVisualBaselineCatalog(commitSha, generatedAt, bundles);
  fs.writeFileSync(path.join(publishRoot, 'index.json'), JSON.stringify(catalog, null, 2));

  return publishRoot;
};

const uploadPublishRoot = (publishRoot: string, commitSha: string) => {
  const originalDirectory = process.cwd();
  const activateScript = path.join(
    getKibanaDir(),
    '.buildkite',
    'scripts',
    'common',
    'activate_service_account.sh'
  );

  try {
    process.chdir(publishRoot);
    execFileSync(
      '/bin/bash',
      [
        '-lc',
        [
          `${activateScript} gs://ci-artifacts.kibana.dev`,
          `gcloud storage rsync --recursive --cache-control="no-cache, max-age=0, no-transform" --gzip-in-flight=json . 'gs://${BASELINES_BUCKET}/commits/${commitSha}/'`,
          `gcloud storage rsync --recursive --delete-unmatched-destination-objects --cache-control="no-cache, max-age=0, no-transform" --gzip-in-flight=json . 'gs://${BASELINES_BUCKET}/latest/'`,
        ].join('\n'),
      ],
      {
        stdio: 'inherit',
      }
    );
  } finally {
    process.chdir(originalDirectory);
  }
};

const runTargetBaselineGroup = (
  group: PlannedVisualBaselineRunGroup,
  buildId: string,
  kibanaInstallDir: string
): VisualRegressionRunManifest => {
  const runId = `vrt-main-${buildId}-${group.runIdSuffix}`;
  console.log(
    `--- Publishing VRT baselines for ${group.target.location}/${group.target.arch}/${group.target.domain}`
  );

  for (const selection of group.selections) {
    runNodeScript(
      path.join(REPO_ROOT, 'scripts', 'scout_vrt'),
      [
        'run-tests',
        '--location',
        group.target.location,
        '--arch',
        group.target.arch,
        '--domain',
        group.target.domain,
        '--config',
        selection.configPath,
        '--kibanaInstallDir',
        kibanaInstallDir,
        '--update-baselines',
      ],
      {
        TEST_RUN_ID: runId,
      }
    );
  }

  return readJsonFile<VisualRegressionRunManifest>(getRunManifestPath(runId));
};

const main = async () => {
  const buildId = getRequiredEnv('BUILDKITE_BUILD_ID');
  const commitSha = getRequiredEnv('BUILDKITE_COMMIT');
  const kibanaInstallDir = getRequiredEnv('KIBANA_BUILD_LOCATION');

  ensureScoutConfigDiscovery();

  const selections = await cli.discoverAllVisualRunSelections();

  if (selections.length === 0) {
    console.log('--- No VRT-enabled Scout configs were discovered on main');
    return;
  }

  const plan = buildMainBaselineRunPlan(selections, readModuleDiscoveryInfo());

  if (plan.length === 0) {
    console.log('--- No VRT baseline publish plan could be created from Scout config discovery');
    return;
  }

  const esDataDir = path.join(REPO_ROOT, '.es');

  const runManifests = plan.map((group) => {
    const manifest = runTargetBaselineGroup(group, buildId, kibanaInstallDir);

    // Clean ES data between groups to prevent disk exhaustion on CI agents
    if (fs.existsSync(esDataDir)) {
      console.log('--- Cleaning ES data directory between VRT baseline groups');
      fs.rmSync(esDataDir, { recursive: true, force: true });
    }

    return manifest;
  });
  const publishRoot = stageBundles(runManifests, commitSha);
  uploadPublishRoot(publishRoot, commitSha);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
