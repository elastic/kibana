/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { ToolingLog } from '@kbn/tooling-log';

import { downloadToDisk } from '../../lib';

const ARTIFACTS_URL = 'https://artifacts.elastic.co/';
const GPG_KEY_NAME = 'GPG-KEY-elasticsearch';
const GPG_KEY_SHA512 =
  '84ee193cc337344d9a7da9021daf3f5ede83f5f1ab049d169f3634921529dcd096abf7a91eec7f26f3a6913e5e38f88f69a5e2ce79ad155d46edc75705a648c6';

export async function downloadElasticGpgKey(pkgDir: string, log: ToolingLog) {
  const gpgKeyUrl = ARTIFACTS_URL + GPG_KEY_NAME;
  const destination = Path.resolve(pkgDir, 'target/keys', GPG_KEY_NAME);
  log.info(`Downloading Elastic GPG key from ${gpgKeyUrl} to ${destination}`);

  try {
    await downloadToDisk({
      log,
      url: gpgKeyUrl,
      destination,
      shaChecksum: GPG_KEY_SHA512,
      shaAlgorithm: 'sha512',
      skipChecksumCheck: false,
      maxAttempts: 3,
    });
  } catch (error) {
    throw new Error(
      `Error downloading Elastic GPG key from ${gpgKeyUrl} to ${destination}: ${error.message}`
    );
  }
}
