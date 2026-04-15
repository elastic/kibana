/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  cli,
  type VisualRegressionManifest,
  type VisualRegressionRunManifest,
  buildDriftikReviewSite,
} from '@kbn/scout-vrt';
import {
  buildMainBaselineRunPlan,
  type ModuleDiscoveryInfo,
  type PlannedVisualBaselineRunGroup,
  type VisualBaselineCatalog,
  type VisualBaselineCatalogEntry,
} from './main_baseline_publisher';
import {
  createPrVrtAnnotation,
  createPrVrtCommentBody,
  createPrVrtCommentHead,
  pickPrVrtStyle,
  summarizePrVrtRuns,
  type PrVrtRunReport,
} from './pr_compare_reporting';
import { getKibanaDir } from '#pipeline-utils';

const MAIN_BASELINES_BUCKET = 'ci-artifacts.kibana.dev/vrt/baselines/main';
const PR_REPORTS_BUCKET = 'ci-artifacts.kibana.dev/vrt/pr';
const DRIFTIK_GCS_TARBALL =
  'gs://ci-artifacts.kibana.dev/driftik/releases/v0.1.1/driftik-0.1.1.tar.gz';
const CONFIG_DISCOVERY_PATH = path.join(
  REPO_ROOT,
  '.scout',
  'test_configs',
  'scout_playwright_configs.json'
);
const LOCAL_BASELINES_ROOT = path.join(REPO_ROOT, '.scout', 'baselines', 'vrt');
const LOCAL_VRT_RUNS_ROOT = path.join(REPO_ROOT, '.scout', 'test-artifacts', 'vrt');

interface CompletedCompareRun {
  exitCode: number;
  runId: string;
  runManifest?: VisualRegressionRunManifest;
}

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

const runNodeScriptWithExitCode = (
  scriptPath: string,
  args: string[],
  env?: Record<string, string>
): number =>
  spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  }).status ?? 1;

const ensureScoutConfigDiscovery = () => {
  console.log('--- Updating Scout config manifests for VRT PR compare');
  runNodeScript(path.join(REPO_ROOT, 'scripts', 'scout.js'), [
    'update-test-config-manifests',
    '--concurrencyLimit',
    '3',
  ]);

  console.log('--- Discovering Scout Playwright configs for VRT PR compare');
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

const readRunManifestIfPresent = (runId: string): VisualRegressionRunManifest | undefined => {
  const manifestPath = getRunManifestPath(runId);
  return fs.existsSync(manifestPath)
    ? readJsonFile<VisualRegressionRunManifest>(manifestPath)
    : undefined;
};

const activateServiceAccountScript = (): string =>
  path.join(getKibanaDir(), '.buildkite', 'scripts', 'common', 'activate_service_account.sh');

const runGcloudCommands = (commands: string[]) => {
  execFileSync(
    '/bin/bash',
    [
      '-lc',
      [`${activateServiceAccountScript()} gs://ci-artifacts.kibana.dev`, ...commands].join('\n'),
    ],
    {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    }
  );
};

const extractBundleArchive = (archivePath: string, destinationRoot: string) => {
  execFileSync('tar', ['-xzf', archivePath, '-C', destinationRoot], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
};

const downloadLatestCatalog = (downloadRoot: string): VisualBaselineCatalog => {
  const catalogPath = path.join(downloadRoot, 'latest-index.json');

  runGcloudCommands([
    `gcloud storage cp --cache-control="no-cache, max-age=0, no-transform" 'gs://${MAIN_BASELINES_BUCKET}/latest/index.json' '${catalogPath}'`,
  ]);

  return readJsonFile<VisualBaselineCatalog>(catalogPath);
};

const matchesTarget = (
  bundle: VisualBaselineCatalogEntry,
  group: PlannedVisualBaselineRunGroup
): boolean =>
  bundle.target.location === group.target.location &&
  bundle.target.arch === group.target.arch &&
  bundle.target.domain === group.target.domain;

const hydrateBundleBaselines = (bundleRoot: string) => {
  const runManifest = readJsonFile<VisualRegressionRunManifest>(
    path.join(bundleRoot, 'manifest.json')
  );

  for (const { packageId } of runManifest.packages) {
    const packageManifest = readJsonFile<VisualRegressionManifest>(
      path.join(bundleRoot, packageId, 'manifest.json')
    );

    for (const { imagePath } of packageManifest.results) {
      const sourcePath = path.join(bundleRoot, imagePath);
      const destinationPath = path.join(LOCAL_BASELINES_ROOT, imagePath);

      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
};

const hydrateLatestBaselinesForPlan = (
  plan: PlannedVisualBaselineRunGroup[],
  catalog: VisualBaselineCatalog,
  downloadRoot: string
) => {
  fs.rmSync(LOCAL_BASELINES_ROOT, { recursive: true, force: true });
  fs.mkdirSync(LOCAL_BASELINES_ROOT, { recursive: true });

  const matchedBundlePaths = new Set<string>();

  for (const group of plan) {
    const matchingBundles = catalog.bundles.filter((bundle) => matchesTarget(bundle, group));

    if (matchingBundles.length === 0) {
      throw new Error(
        `No latest main baseline bundle found for ${group.target.location}/${group.target.arch}/${group.target.domain}`
      );
    }

    for (const bundle of matchingBundles) {
      if (matchedBundlePaths.has(bundle.relativePath)) {
        continue;
      }

      const bundleRoot = path.join(downloadRoot, bundle.relativePath);
      fs.mkdirSync(path.dirname(bundleRoot), { recursive: true });

      if (bundle.archivePath) {
        const archivePath = path.join(downloadRoot, bundle.archivePath);
        fs.mkdirSync(path.dirname(archivePath), { recursive: true });
        runGcloudCommands([
          `gcloud storage cp --cache-control="no-cache, max-age=0, no-transform" 'gs://${MAIN_BASELINES_BUCKET}/latest/${bundle.archivePath}' '${archivePath}'`,
        ]);
        extractBundleArchive(archivePath, downloadRoot);
      } else {
        fs.mkdirSync(bundleRoot, { recursive: true });
        runGcloudCommands([
          `gcloud storage rsync --recursive 'gs://${MAIN_BASELINES_BUCKET}/latest/${bundle.relativePath}/' '${bundleRoot}'`,
        ]);
      }

      hydrateBundleBaselines(bundleRoot);
      matchedBundlePaths.add(bundle.relativePath);
    }
  }
};

const runTargetCompareGroup = (
  group: PlannedVisualBaselineRunGroup,
  buildId: string,
  kibanaInstallDir: string
): CompletedCompareRun => {
  const runId = `vrt-pr-${buildId}-${group.runIdSuffix}`;
  let exitCode = 0;

  console.log(
    `--- Running VRT compare for ${group.target.location}/${group.target.arch}/${group.target.domain}`
  );

  for (const selection of group.selections) {
    const nextExitCode = runNodeScriptWithExitCode(
      path.join(REPO_ROOT, 'scripts', 'scout_vrt'),
      [
        'run-tests',
        '--compare-baselines',
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
      ],
      {
        TEST_RUN_ID: runId,
      }
    );

    if (nextExitCode !== 0 && exitCode === 0) {
      exitCode = nextExitCode;
    }
  }

  return {
    exitCode,
    runId,
    runManifest: readRunManifestIfPresent(runId),
  };
};

const writeReviewSite = (
  runReports: PrVrtRunReport[],
  reportUrl: string,
  driftikDistDir: string
): string => {
  const siteRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kibana-vrt-pr-site-'));
  const summary = summarizePrVrtRuns(runReports);

  for (const runReport of runReports) {
    const runManifest = runReport.runManifest;
    const runJsonDir = path.join(siteRoot, 'json', runManifest.runId);
    fs.mkdirSync(runJsonDir, { recursive: true });
    fs.writeFileSync(path.join(runJsonDir, 'manifest.json'), JSON.stringify(runManifest, null, 2));

    const packageManifests: VisualRegressionManifest[] = runManifest.packages.map((pkg) => {
      const packageManifest = readJsonFile<VisualRegressionManifest>(
        getPackageManifestPath(runManifest.runId, pkg.packageId)
      );
      const packageJsonDir = path.join(runJsonDir, pkg.packageId);
      fs.mkdirSync(packageJsonDir, { recursive: true });
      fs.writeFileSync(
        path.join(packageJsonDir, 'manifest.json'),
        JSON.stringify(packageManifest, null, 2)
      );
      return packageManifest;
    });

    buildDriftikReviewSite(packageManifests, {
      siteRoot,
      driftikDistDir,
      baselinesRoot: LOCAL_BASELINES_ROOT,
      artifactsRoot: path.join(LOCAL_VRT_RUNS_ROOT, runManifest.runId, 'test-artifacts'),
      runId: runManifest.runId,
    });
  }

  fs.writeFileSync(
    path.join(siteRoot, 'index.json'),
    JSON.stringify(
      {
        summary,
        reportUrl,
        runs: runReports.map(({ runManifest, status }) => ({
          runId: runManifest.runId,
          status,
          target: runManifest.target,
          summary: runManifest.summary,
          packages: runManifest.packages.map(({ packageId, status: packageStatus }) => ({
            packageId,
            status: packageStatus,
          })),
        })),
      },
      null,
      2
    )
  );

  return siteRoot;
};

const uploadReviewSite = (siteRoot: string, prNumber: string, buildId: string): string => {
  const reportUrl = `https://${PR_REPORTS_BUCKET}/${prNumber}/${buildId}/index.html`;

  runGcloudCommands([
    `cd '${siteRoot}'`,
    `gcloud storage rsync --recursive --delete-unmatched-destination-objects --cache-control="no-cache, max-age=0, no-transform" --gzip-in-flight=html,json . 'gs://${PR_REPORTS_BUCKET}/${prNumber}/${buildId}/'`,
  ]);

  return reportUrl;
};

const annotateAndComment = (runReports: PrVrtRunReport[], reportUrl: string) => {
  const style = pickPrVrtStyle(runReports);
  const annotation = createPrVrtAnnotation(runReports, reportUrl);

  execFileSync('buildkite-agent', ['annotate', '--context', 'vrt', '--style', style, annotation], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  execFileSync(
    'buildkite-agent',
    ['meta-data', 'set', 'pr_comment:vrt:head', createPrVrtCommentHead(runReports, reportUrl)],
    { cwd: REPO_ROOT, stdio: 'inherit' }
  );

  execFileSync(
    'buildkite-agent',
    ['meta-data', 'set', 'pr_comment:vrt:body', createPrVrtCommentBody(runReports, reportUrl)],
    { cwd: REPO_ROOT, stdio: 'inherit' }
  );
};

const main = async () => {
  const buildId = getRequiredEnv('BUILDKITE_BUILD_ID');
  const kibanaInstallDir = getRequiredEnv('KIBANA_BUILD_LOCATION');
  const prNumber = getRequiredEnv('GITHUB_PR_NUMBER');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kibana-vrt-pr-'));

  ensureScoutConfigDiscovery();

  const selections = await cli.discoverAllVisualRunSelections();

  if (selections.length === 0) {
    console.log('--- No VRT-enabled Scout configs were discovered for this PR');
    return;
  }

  const plan = buildMainBaselineRunPlan(selections, readModuleDiscoveryInfo());

  if (plan.length === 0) {
    console.log('--- No VRT compare plan could be created from Scout config discovery');
    return;
  }

  hydrateLatestBaselinesForPlan(plan, downloadLatestCatalog(tempRoot), tempRoot);

  console.log('--- Downloading pinned Driftik build');
  const driftikTarball = path.join(tempRoot, 'driftik.tar.gz');
  const driftikDistDir = path.join(tempRoot, 'driftik-dist');
  fs.mkdirSync(driftikDistDir, { recursive: true });
  runGcloudCommands([
    `gcloud storage cp --cache-control="no-cache, max-age=0, no-transform" '${DRIFTIK_GCS_TARBALL}' '${driftikTarball}'`,
  ]);
  extractBundleArchive(driftikTarball, driftikDistDir);

  const completedRuns = plan.map((group) =>
    runTargetCompareGroup(group, buildId, kibanaInstallDir)
  );
  const runReports = completedRuns
    .filter(
      (
        completedRun
      ): completedRun is CompletedCompareRun & { runManifest: VisualRegressionRunManifest } =>
        completedRun.runManifest !== undefined
    )
    .map<PrVrtRunReport>(({ runManifest }) => ({
      status: runManifest.status,
      summary: runManifest.summary,
      runManifest,
    }));

  if (runReports.length === 0) {
    throw new Error('VRT compare completed without producing any run manifests');
  }

  const siteRoot = writeReviewSite(
    runReports,
    `https://${PR_REPORTS_BUCKET}/${prNumber}/${buildId}/index.html`,
    driftikDistDir
  );
  const reportUrl = uploadReviewSite(siteRoot, prNumber, buildId);
  annotateAndComment(runReports, reportUrl);

  const failedRun = completedRuns.find(({ exitCode }) => exitCode !== 0);

  if (failedRun) {
    process.exitCode = failedRun.exitCode;
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
