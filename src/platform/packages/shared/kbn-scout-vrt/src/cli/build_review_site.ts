/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import path from 'node:path';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type {
  VisualRegressionManifest,
  VisualRegressionRunManifest,
} from '../playwright/reporting/manifest';
import { buildDriftikReviewSite } from '../review_site/driftik_adapter';

interface ParsedBuildReviewSiteArgs {
  runId?: string;
  driftikDir?: string;
  outputDir?: string;
  helpRequested: boolean;
}

const parseBuildReviewSiteArgs = (rawArgs: string[]): ParsedBuildReviewSiteArgs => {
  let runId: string | undefined;
  let driftikDir: string | undefined;
  let outputDir: string | undefined;
  let helpRequested = false;

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];

    if (arg === '--help' || arg === '-h') {
      helpRequested = true;
    } else if (arg === '--run-id' && i + 1 < rawArgs.length) {
      runId = rawArgs[++i];
    } else if (arg === '--driftik-dir' && i + 1 < rawArgs.length) {
      driftikDir = rawArgs[++i];
    } else if (arg === '--output' && i + 1 < rawArgs.length) {
      outputDir = rawArgs[++i];
    }
  }

  return { runId, driftikDir, outputDir, helpRequested };
};

export const getBuildReviewSiteHelpText = (): string => `Build a Driftik-powered VRT review site from a compare run.

Usage:
  node scripts/scout_vrt build-review-site --run-id <runId> --driftik-dir <path>
  node scripts/scout_vrt build-review-site --run-id <runId> --driftik-dir <path> --output <path>

Options:
  --run-id <id>         Run ID of a completed compare run (required)
  --driftik-dir <path>  Path to the Driftik dist/ directory (required)
  --output <path>       Output directory for the review site (default: .scout/review-site)

The review site can be served with any static file server:
  npx serve .scout/review-site
  python3 -m http.server -d .scout/review-site`;

const readJsonFile = <T>(filePath: string): T =>
  JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;

const resolveLatestRunId = (): string | undefined => {
  const runsRoot = path.join(REPO_ROOT, '.scout', 'test-artifacts', 'vrt');

  if (!fs.existsSync(runsRoot)) {
    return undefined;
  }

  const entries = fs.readdirSync(runsRoot, { withFileTypes: true });
  let latestRunId: string | undefined;
  let latestMtime = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const manifestPath = path.join(runsRoot, entry.name, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    const stat = fs.statSync(manifestPath);

    if (stat.mtimeMs > latestMtime) {
      latestMtime = stat.mtimeMs;
      latestRunId = entry.name;
    }
  }

  return latestRunId;
};

export const buildReviewSiteCommand = async (rawArgs: string[]) => {
  const args = parseBuildReviewSiteArgs(rawArgs);

  if (args.helpRequested) {
    process.stdout.write(`${getBuildReviewSiteHelpText()}\n`);
    return;
  }

  const runId = args.runId ?? resolveLatestRunId();

  if (!runId) {
    throw createFlagError(
      'No --run-id provided and no compare runs found in .scout/test-artifacts/vrt/'
    );
  }

  if (!args.driftikDir) {
    throw createFlagError('--driftik-dir is required (path to the Driftik dist/ directory)');
  }

  const driftikDir = path.resolve(args.driftikDir);

  if (!fs.existsSync(path.join(driftikDir, 'index.html'))) {
    throw createFlagError(
      `Driftik dist directory does not contain index.html: ${driftikDir}`
    );
  }

  const outputDir = path.resolve(
    args.outputDir ?? path.join(REPO_ROOT, '.scout', 'review-site')
  );

  const runManifestPath = path.join(
    REPO_ROOT,
    '.scout',
    'test-artifacts',
    'vrt',
    runId,
    'manifest.json'
  );

  if (!fs.existsSync(runManifestPath)) {
    throw createFlagError(`Run manifest not found: ${runManifestPath}`);
  }

  const runManifest = readJsonFile<VisualRegressionRunManifest>(runManifestPath);

  if (runManifest.mode !== 'compare') {
    process.stdout.write(
      `scout_vrt: warning: run ${runId} has mode '${runManifest.mode}', expected 'compare'\n`
    );
  }

  const packageManifests: VisualRegressionManifest[] = runManifest.packages.map((pkg) => {
    const packageManifestPath = path.join(
      REPO_ROOT,
      '.scout',
      'test-artifacts',
      'vrt',
      runId,
      'test-artifacts',
      pkg.packageId,
      'manifest.json'
    );
    return readJsonFile<VisualRegressionManifest>(packageManifestPath);
  });

  // Clean output directory
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }

  const baselinesRoot = path.join(REPO_ROOT, '.scout', 'baselines', 'vrt');
  const artifactsRoot = path.join(
    REPO_ROOT,
    '.scout',
    'test-artifacts',
    'vrt',
    runId,
    'test-artifacts'
  );

  buildDriftikReviewSite(packageManifests, {
    siteRoot: outputDir,
    driftikDistDir: driftikDir,
    baselinesRoot,
    artifactsRoot,
    runId,
  });

  // Preserve Kibana-native manifests
  const jsonDir = path.join(outputDir, 'json', runId);
  fs.mkdirSync(jsonDir, { recursive: true });
  fs.writeFileSync(path.join(jsonDir, 'manifest.json'), JSON.stringify(runManifest, null, 2));

  for (const packageManifest of packageManifests) {
    const packageJsonDir = path.join(jsonDir, packageManifest.packageId);
    fs.mkdirSync(packageJsonDir, { recursive: true });
    fs.writeFileSync(
      path.join(packageJsonDir, 'manifest.json'),
      JSON.stringify(packageManifest, null, 2)
    );
  }

  process.stdout.write(`scout_vrt: review site built at ${outputDir}\n`);
  process.stdout.write(`scout_vrt: run ID: ${runId}\n`);
  process.stdout.write(`scout_vrt: ${runManifest.summary.checkpoints} checkpoints\n`);
  process.stdout.write(`scout_vrt: ${runManifest.summary.diffs} diffs\n`);
  process.stdout.write(`\nServe with:\n  npx serve ${outputDir}\n`);
};
