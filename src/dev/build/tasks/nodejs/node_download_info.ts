/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { basename } from 'path';

import type { Config, Platform } from '../../lib';

/** Official Node 24 shipped as `node/default` and `node/pointer-compression` on serverless Linux. */
export const SERVERLESS_NODE_24_VERSION = '24.21.0';
/** Custom heap-labels Node shipped under `node/node-26-pointer-compression`. */
export const SERVERLESS_NODE_26_PC_VERSION = '26.8.1';
export const SERVERLESS_NODE_26_PC_VARIANT = 'node-26-pointer-compression';

interface NodeDownloadSpec {
  version: string;
  variant: string;
}

export function getNodeDistVariantPath(variant: string | null): string {
  if (variant === 'pointer-compression' || variant === SERVERLESS_NODE_26_PC_VARIANT) {
    return 'node-pointer-compression/';
  }
  if (variant === 'glibc-217') {
    return 'node-glibc-217/';
  }
  return '';
}

export function getNodeDownloadInfo(config: Config, platform: Platform) {
  const version = config.getNodeVersion();
  const arch = platform.getNodeArch();
  const specs: NodeDownloadSpec[] = [{ version, variant: 'default' }];

  if (platform.isLinux()) {
    if (platform.isServerless()) {
      specs.length = 0;
      specs.push({ version: SERVERLESS_NODE_24_VERSION, variant: 'default' });
      specs.push({ version: SERVERLESS_NODE_24_VERSION, variant: 'pointer-compression' });
      specs.push({
        version: SERVERLESS_NODE_26_PC_VERSION,
        variant: SERVERLESS_NODE_26_PC_VARIANT,
      });
    }
    // Experiment: no glibc-217 build exists for the patched 26.8.1, so only the
    // default Linux variant is bundled. The launcher falls back to glibc-217
    // only when the default binary fails to run.

    // Overrides for running all tests with specific variants enabled
    if (Boolean(process.env.CI_FORCE_NODE_POINTER_COMPRESSION)) {
      specs.length = 0;
      specs.push({ version, variant: 'pointer-compression' });
    }
    if (Boolean(process.env.CI_FORCE_NODE_GLIBC_217)) {
      specs.length = 0;
      specs.push({ version, variant: 'glibc-217' });
    }
  }

  return specs.map((spec) => {
    const downloadName = platform.isWindows()
      ? `win-${platform.getArchitecture()}/node.exe`
      : `node-v${spec.version}-${arch}.tar.gz`;

    const variantPath = getNodeDistVariantPath(spec.variant);
    const url = `https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/${variantPath}dist/v${spec.version}/${downloadName}`;
    const downloadPath = config.resolveFromRepo(
      '.node_binaries',
      spec.version,
      spec.variant,
      platform.getNodeArch(),
      'download',
      basename(downloadName)
    );
    const extractDir = config.resolveFromRepo(
      '.node_binaries',
      spec.version,
      spec.variant,
      platform.getNodeArch(),
      'extract'
    );

    return {
      url,
      downloadName,
      downloadPath,
      extractDir,
      variant: spec.variant,
      version: spec.version,
    };
  });
}
