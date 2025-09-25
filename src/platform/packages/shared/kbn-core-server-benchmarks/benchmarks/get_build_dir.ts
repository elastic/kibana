/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Fs from 'fs/promises';
import Path from 'path';

function getPathTokens(): { platformTokens: string[]; archTokens: string[] } {
  const nodePlatform = process.platform as NodeJS.Platform;
  if (!['darwin', 'linux', 'win32'].includes(nodePlatform)) {
    throw new Error(`Unsupported platform ${nodePlatform}-${process.arch}`);
  }

  // Build artifact directories use slightly different tokens than process.arch
  // on some platforms, see src/dev/build/lib/platform.ts - which we can't use
  // because it's not a package.
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const archTokens = arch === 'arm64' ? ['arm64', 'aarch64'] : ['x64', 'x86_64'];
  const platformTokens = nodePlatform === 'win32' ? ['windows', 'win32'] : [nodePlatform];
  return { platformTokens, archTokens };
}

/**
 * Get the Kibana build dir for the current platform/arch
 */
export async function getBuildDir(rootBuildDir: string) {
  let distDir: string | undefined;

  const entries = await Fs.readdir(rootBuildDir, { withFileTypes: true });
  const candidateNames = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('kibana-'))
    .map((entry) => entry.name);

  const { platformTokens, archTokens } = getPathTokens();

  const match = candidateNames.find((name) => {
    const lower = name.toLowerCase();
    return (
      platformTokens.some((token) => lower.includes(`-${token}-`)) &&
      archTokens.some((token) => lower.endsWith(`-${token}`) || lower.includes(`-${token}-`))
    );
  });

  if (match) {
    const candidatePath = Path.join(rootBuildDir, match);
    await Fs.access(Path.join(candidatePath, 'bin', 'kibana'));
    distDir = candidatePath;
    return distDir;
  }

  throw new Error(
    `Unable to locate built Kibana distribution for platform ${process.platform} / arch ${process.arch} in ${rootBuildDir}`
  );
}
