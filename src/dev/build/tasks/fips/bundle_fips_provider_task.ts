/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copyFile, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createHash } from 'crypto';
import type { Task } from '../../lib';
import { downloadToDisk, exec, scanCopy } from '../../lib';
import {
  OPENSSL_FIPS_BUILD_IMAGE,
  OPENSSL_FIPS_CERTIFICATE_URL,
  OPENSSL_FIPS_SECURITY_POLICY_URL,
  OPENSSL_FIPS_SOURCE_SHA256,
  OPENSSL_FIPS_SOURCE_URL,
  OPENSSL_FIPS_VERSION,
} from '../../lib/fips_config';

export const BundleFipsProvider: Task = {
  description: 'Building and bundling the upstream OpenSSL FIPS provider for Linux distributions',
  async run(config, log, build) {
    const linuxPlatforms = config
      .getTargetPlatforms()
      .filter((target) => target.isLinux() && target.getVariant() === undefined);
    if (!linuxPlatforms.length) return;

    const temporaryDir = await mkdtemp(join(tmpdir(), 'kibana-fips-provider-'));
    try {
      await downloadToDisk({
        log,
        url: OPENSSL_FIPS_SOURCE_URL,
        destination: join(temporaryDir, 'openssl.tar.gz'),
        shaChecksum: OPENSSL_FIPS_SOURCE_SHA256,
        shaAlgorithm: 'sha256',
        maxAttempts: 3,
      });
      for (const name of ['Dockerfile', 'build_provider.sh']) {
        await copyFile(join(__dirname, 'resources', name), join(temporaryDir, name));
      }

      for (const platform of linuxPlatforms) {
        const architecture = platform.getArchitecture();
        const dockerPlatform = `linux/${architecture === 'x64' ? 'amd64' : 'arm64'}`;
        const providerDir = join(temporaryDir, architecture);
        await exec(
          log,
          'docker',
          [
            'buildx',
            'build',
            '--platform',
            dockerPlatform,
            '--build-arg',
            `BUILD_IMAGE=${OPENSSL_FIPS_BUILD_IMAGE}`,
            '--build-arg',
            `OPENSSL_VERSION=${OPENSSL_FIPS_VERSION}`,
            '--build-arg',
            `OPENSSL_SHA256=${OPENSSL_FIPS_SOURCE_SHA256}`,
            '--output',
            `type=local,dest=${providerDir}`,
            '.',
          ],
          { cwd: temporaryDir }
        );

        const module = await readFile(join(providerDir, 'modules/fips.so'));
        const expectedMachine = architecture === 'x64' ? 62 : 183;
        if (
          module.length < 20 ||
          module.subarray(0, 4).toString('hex') !== '7f454c46' ||
          module[4] !== 2 ||
          module[5] !== 1 ||
          module.readUInt16LE(18) !== expectedMachine
        ) {
          throw new Error(`The FIPS provider does not match ${dockerPlatform}`);
        }
        const moduleConfig = await readFile(join(providerDir, 'config/fipsmodule.cnf'), 'utf8');
        if (!/^module-mac\s*=\s*(?:[A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}\s*$/m.test(moduleConfig)) {
          throw new Error('The FIPS provider integrity configuration is missing module-mac');
        }
        if (/^install-(?:status|mac)\s*=/m.test(moduleConfig)) {
          throw new Error('The FIPS provider configuration must run self-tests on every load');
        }
        for (const setting of [
          'activate',
          'conditional-errors',
          'security-checks',
          'tls1-prf-ems-check',
          'drbg-no-trunc-md',
        ]) {
          if (!new RegExp(`^${setting}\\s*=\\s*1\\s*$`, 'm').test(moduleConfig)) {
            throw new Error(`The FIPS provider configuration must enable ${setting}`);
          }
        }

        await copyFile(
          join(__dirname, 'resources/nodejs.cnf'),
          join(providerDir, 'config/nodejs.cnf')
        );
        const moduleSha512 = createHash('sha512').update(module).digest('hex');
        const buildInfo = await readFile(join(providerDir, 'build_info.txt'));
        await writeFile(
          join(providerDir, 'manifest.json'),
          `${JSON.stringify(
            {
              sourceUrl: OPENSSL_FIPS_SOURCE_URL,
              sourceSha256: OPENSSL_FIPS_SOURCE_SHA256,
              version: OPENSSL_FIPS_VERSION,
              buildImage: OPENSSL_FIPS_BUILD_IMAGE,
              architecture: dockerPlatform,
              certificateUrl: OPENSSL_FIPS_CERTIFICATE_URL,
              securityPolicyUrl: OPENSSL_FIPS_SECURITY_POLICY_URL,
              selfTests: 'onload',
              moduleSha512,
              configSha512: createHash('sha512').update(moduleConfig).digest('hex'),
              buildInfoSha512: createHash('sha512').update(buildInfo).digest('hex'),
            },
            null,
            2
          )}\n`
        );
        await writeFile(
          join(providerDir, 'sbom.spdx.json'),
          `${JSON.stringify(
            {
              spdxVersion: 'SPDX-2.3',
              dataLicense: 'CC0-1.0',
              SPDXID: 'SPDXRef-DOCUMENT',
              name: `OpenSSL-FIPS-Provider-${OPENSSL_FIPS_VERSION}-${architecture}`,
              documentNamespace: `https://elastic.co/spdx/openssl-fips/${OPENSSL_FIPS_VERSION}/${moduleSha512}`,
              creationInfo: {
                creators: ['Organization: Elasticsearch B.V.'],
                created: config.getBuildDate(),
              },
              packages: [
                {
                  SPDXID: 'SPDXRef-OpenSSL-FIPS-Provider',
                  name: 'OpenSSL FIPS Provider',
                  versionInfo: OPENSSL_FIPS_VERSION,
                  downloadLocation: OPENSSL_FIPS_SOURCE_URL,
                  filesAnalyzed: false,
                  licenseConcluded: 'Apache-2.0',
                  licenseDeclared: 'Apache-2.0',
                  copyrightText: 'Copyright 1998-2023 The OpenSSL Project Authors',
                  checksums: [{ algorithm: 'SHA512', checksumValue: moduleSha512 }],
                  sourceInfo: `Built from source archive with SHA256 ${OPENSSL_FIPS_SOURCE_SHA256}; see manifest.json and build_info.txt.`,
                },
              ],
              relationships: [
                {
                  spdxElementId: 'SPDXRef-DOCUMENT',
                  relationshipType: 'DESCRIBES',
                  relatedSpdxElement: 'SPDXRef-OpenSSL-FIPS-Provider',
                },
              ],
            },
            null,
            2
          )}\n`
        );
        await writeFile(
          join(providerDir, 'NOTICE.txt'),
          `OpenSSL FIPS Provider ${OPENSSL_FIPS_VERSION}\nLicensed under the Apache License, Version 2.0; see LICENSE.txt.\nProvider provenance: manifest.json, build_info.txt, and sbom.spdx.json.\nApproved operation requires compliance with the Security Policy, including the external entropy source and operating environment requirements.\n${OPENSSL_FIPS_SECURITY_POLICY_URL}\n`
        );
        await scanCopy({
          source: providerDir,
          destination: build.resolvePathForPlatform(platform, 'node/fips'),
        });
        log.info(
          `Built and bundled OpenSSL FIPS provider for ${architecture}: ${module.length} bytes`
        );
      }
    } finally {
      await rm(temporaryDir, { recursive: true, force: true });
    }
  },
};
