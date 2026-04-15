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
import path from 'node:path';

interface DriftikBuildDescriptor {
  version: string;
  gcsBucket: string;
  gcsPath: string;
  tarball: string;
  checksum: string;
}

const readBuildDescriptor = (): DriftikBuildDescriptor => {
  const descriptorPath = path.join(__dirname, 'driftik_build.json');
  return JSON.parse(fs.readFileSync(descriptorPath, 'utf8')) as DriftikBuildDescriptor;
};

export interface DownloadDriftikOptions {
  /** Directory to extract the Driftik dist/ contents into */
  outputDir: string;
}

/**
 * Downloads and extracts the pinned Driftik static build from GCS.
 *
 * Uses the same GCS auth as the baseline downloader (service account
 * activated by the Buildkite pipeline, or local gcloud auth).
 * Returns the path to the extracted directory containing index.html.
 */
export const downloadPinnedDriftikBuild = (options: DownloadDriftikOptions): string => {
  const { outputDir } = options;
  const { version, gcsBucket, gcsPath, tarball } = readBuildDescriptor();

  const downloadDir = path.join(outputDir, '.driftik-download');
  fs.mkdirSync(downloadDir, { recursive: true });

  const gcsUrl = `gs://${gcsBucket}/${gcsPath}/${tarball}`;
  const localTarball = path.join(downloadDir, tarball);

  process.stdout.write(`--- Downloading Driftik v${version} from ${gcsUrl}\n`);

  execFileSync(
    'gcloud',
    [
      'storage',
      'cp',
      '--cache-control=no-cache, max-age=0, no-transform',
      gcsUrl,
      localTarball,
    ],
    { stdio: 'inherit' }
  );

  if (!fs.existsSync(localTarball)) {
    throw new Error(`Driftik tarball not found after download: ${localTarball}`);
  }

  const extractDir = path.join(outputDir, 'driftik-dist');
  fs.mkdirSync(extractDir, { recursive: true });

  process.stdout.write(`--- Extracting Driftik to ${extractDir}\n`);
  execFileSync('tar', ['-xzf', localTarball, '-C', extractDir], {
    stdio: 'inherit',
  });

  if (!fs.existsSync(path.join(extractDir, 'index.html'))) {
    throw new Error(`Extracted Driftik build at ${extractDir} does not contain index.html`);
  }

  fs.rmSync(downloadDir, { recursive: true });

  return extractDir;
};
