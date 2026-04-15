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
  repo: string;
  tag: string;
  tarballPattern: string;
  checksumPattern: string;
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
 * Downloads and extracts the pinned Driftik static build from a GitHub release.
 *
 * Requires `gh` CLI to be authenticated with access to elastic/driftik.
 * Returns the path to the extracted directory containing index.html.
 */
export const downloadPinnedDriftikBuild = (options: DownloadDriftikOptions): string => {
  const { outputDir } = options;
  const { repo, tag, tarballPattern, checksumPattern } = readBuildDescriptor();

  const downloadDir = path.join(outputDir, '.driftik-download');
  fs.mkdirSync(downloadDir, { recursive: true });

  process.stdout.write(`--- Downloading Driftik ${tag} from ${repo}\n`);

  execFileSync('gh', ['release', 'download', tag, '--repo', repo, '--pattern', tarballPattern, '--pattern', checksumPattern, '--dir', downloadDir], {
    stdio: 'inherit',
  });

  const tarballFile = fs.readdirSync(downloadDir).find((f) => f.endsWith('.tar.gz') && !f.endsWith('.sha256'));

  if (!tarballFile) {
    throw new Error(`No tarball found after downloading release ${tag} from ${repo}`);
  }

  const checksumFile = fs.readdirSync(downloadDir).find((f) => f.endsWith('.sha256'));

  if (checksumFile) {
    process.stdout.write('--- Verifying Driftik checksum\n');
    execFileSync('sha256sum', ['--check', checksumFile], {
      cwd: downloadDir,
      stdio: 'inherit',
    });
  }

  const extractDir = path.join(outputDir, 'driftik-dist');
  fs.mkdirSync(extractDir, { recursive: true });

  process.stdout.write(`--- Extracting Driftik to ${extractDir}\n`);
  execFileSync('tar', ['-xzf', path.join(downloadDir, tarballFile), '-C', extractDir], {
    stdio: 'inherit',
  });

  if (!fs.existsSync(path.join(extractDir, 'index.html'))) {
    throw new Error(`Extracted Driftik build at ${extractDir} does not contain index.html`);
  }

  // Clean up download artifacts
  fs.rmSync(downloadDir, { recursive: true });

  return extractDir;
};
