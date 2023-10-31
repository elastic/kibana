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
  '62a567354286deb02baf5fc6b82ddf6c7067898723463da9ae65b132b8c6d6f064b2874e390885682376228eed166c1c82fe7f11f6c9a69f0c157029c548fa3d';

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
