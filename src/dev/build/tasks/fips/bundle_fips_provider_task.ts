/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createHash } from 'crypto';
import execa from 'execa';
import type { Task } from '../../lib';
import { exec, scanCopy } from '../../lib';
import { FIPS_BASE_IMAGE } from '../../lib/fips_config';

interface DockerImageIndex {
  manifests: Array<{
    digest: string;
    platform: { architecture: string; os: string };
  }>;
}

export const BundleFipsProvider: Task = {
  description: 'Bundling the OpenSSL FIPS provider for Linux distributions',
  async run(config, log, build) {
    const platforms = config.getTargetPlatforms();
    const fipsPlatforms = platforms.filter((target) => target.isFips());
    if (!fipsPlatforms.length) return;
    const { stdout } = await execa('docker', [
      'buildx',
      'imagetools',
      'inspect',
      '--raw',
      FIPS_BASE_IMAGE,
    ]);
    const imageIndex = JSON.parse(stdout) as DockerImageIndex;
    for (const platform of fipsPlatforms) {
      const architecture = platform.getArchitecture();
      const dockerArchitecture = architecture === 'x64' ? 'amd64' : 'arm64';
      const dockerPlatform = `linux/${dockerArchitecture}`;
      const manifest = imageIndex.manifests.find(
        ({ platform: target }) =>
          target.os === 'linux' && target.architecture === dockerArchitecture
      );
      if (!manifest || !/^sha256:[a-f0-9]{64}$/.test(manifest.digest)) {
        throw new Error(`The pinned FIPS image does not include ${dockerPlatform}`);
      }
      // Resolve the child manifest so classic Docker image stores can hold both architectures.
      const platformImage = `${FIPS_BASE_IMAGE.split('@')[0]}@${manifest.digest}`;
      const container = `kibana-fips-provider-${architecture}-${process.pid}`;
      const temporaryDir = await mkdtemp(join(tmpdir(), 'kibana-fips-provider-'));
      const providerDir = join(temporaryDir, 'provider');
      await mkdir(join(providerDir, 'modules'), { recursive: true });
      await mkdir(join(providerDir, 'config'), { recursive: true });

      try {
        await exec(log, 'docker', ['pull', '--platform', dockerPlatform, platformImage]);
        await exec(log, 'docker', [
          'create',
          '--platform',
          dockerPlatform,
          '--name',
          container,
          platformImage,
        ]);
        try {
          for (const [source, destination] of [
            ['/usr/lib64/ossl-modules/fips.so', join(providerDir, 'modules/fips.so')],
            ['/etc/ssl/fipsmodule.cnf', join(providerDir, 'config/fipsmodule.cnf')],
            ['/var/lib/db/sbom', join(temporaryDir, 'sbom')],
          ]) {
            await exec(log, 'docker', ['cp', `${container}:${source}`, destination]);
          }
        } finally {
          await exec(log, 'docker', ['rm', container]);
        }

        const module = await readFile(join(providerDir, 'modules/fips.so'));
        const expectedMachine = architecture === 'x64' ? 62 : 183;
        if (
          module.length < 20 ||
          module.subarray(0, 4).toString('hex') !== '7f454c46' ||
          module.readUInt16LE(18) !== expectedMachine
        ) {
          throw new Error(`The FIPS provider does not match ${dockerPlatform}`);
        }
        const moduleConfig = await readFile(join(providerDir, 'config/fipsmodule.cnf'), 'utf8');
        if (!/^module-mac\s*=/m.test(moduleConfig)) {
          throw new Error('The FIPS provider integrity configuration is missing module-mac');
        }

        await copyFile(
          join(__dirname, 'resources/nodejs.cnf'),
          join(providerDir, 'config/nodejs.cnf')
        );
        await copyFile(
          config.resolveFromRepo('licenses/APACHE-LICENSE-2.0.txt'),
          join(providerDir, 'LICENSE.txt')
        );
        const sbomFiles = (await readdir(join(temporaryDir, 'sbom'))).filter((name) =>
          /^(openssl-provider-fips-|NIST-CMVP-|NIST-ESV-)/.test(name)
        );
        if (
          !sbomFiles.some((name) => name.startsWith('openssl-provider-fips-')) ||
          !sbomFiles.some((name) => name.startsWith('NIST-CMVP-'))
        ) {
          throw new Error('The pinned image is missing the FIPS provider or validation SBOM');
        }
        await mkdir(join(providerDir, 'sbom'));
        for (const name of sbomFiles) {
          await copyFile(join(temporaryDir, 'sbom', name), join(providerDir, 'sbom', name));
        }
        await writeFile(
          join(providerDir, 'manifest.json'),
          `${JSON.stringify(
            {
              sourceImage: FIPS_BASE_IMAGE,
              platformImage,
              architecture: dockerPlatform,
              moduleSha512: createHash('sha512').update(module).digest('hex'),
              configSha512: createHash('sha512').update(moduleConfig).digest('hex'),
              sbomFiles,
            },
            null,
            2
          )}\n`
        );
        await writeFile(
          join(providerDir, 'NOTICE.txt'),
          'Chainguard FIPS Provider for OpenSSL\nLicensed under the Apache License, Version 2.0; see LICENSE.txt.\nProvider provenance and validation metadata: manifest.json and sbom/.\n'
        );

        await scanCopy({
          source: providerDir,
          destination: build.resolvePathForPlatform(platform, 'node/fips'),
        });
        log.info(`Bundled FIPS provider for ${architecture}: ${module.length} bytes`);
      } finally {
        await rm(temporaryDir, { recursive: true, force: true });
      }
    }
  },
};
