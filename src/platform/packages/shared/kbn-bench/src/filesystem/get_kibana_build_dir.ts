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

function getBuildName(): string {
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    throw new Error(`Unsupported platform ${process.platform}-${process.arch}`);
  }

  const architectureByProcessArch: Partial<Record<NodeJS.Architecture, string>> = {
    arm64: 'aarch64',
    x64: 'x86_64',
  };
  const architecture = architectureByProcessArch[process.arch];
  if (!architecture) {
    throw new Error(`Unsupported architecture ${process.arch}`);
  }

  return `${process.platform}-${architecture}`;
}

/**
 * Get the Kibana build dir for the current platform/arch.
 */
export async function getKibanaBuildDir(rootBuildDir: string): Promise<string> {
  const buildName = getBuildName();
  const entries = await Fs.readdir(rootBuildDir, { withFileTypes: true });
  const match = entries.find((entry) => {
    return (
      entry.isDirectory() && entry.name.startsWith('kibana-') && entry.name.endsWith(buildName)
    );
  });

  if (match) {
    const candidatePath = Path.join(rootBuildDir, match.name);
    await Fs.access(Path.join(candidatePath, 'bin', 'kibana'));
    return candidatePath;
  }

  throw new Error(`Unable to locate built Kibana distribution for ${buildName} in ${rootBuildDir}`);
}
