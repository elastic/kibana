/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Task, downloadToDisk } from '../lib';

const BUNDLED_KEYS_DIR = 'x-pack/plugins/fleet/target/keys';
const ARTIFACTS_URL = 'https://artifacts.elastic.co/';
const GPG_KEY_NAME = 'GPG-KEY-elasticsearch';

export const FleetDownloadElasticGpgKey: Task = {
  description: 'Downloading Elastic GPG key for Fleet',

  async run(config, log, build) {
    const gpgKeyUrl = ARTIFACTS_URL + GPG_KEY_NAME;
    const destination = build.resolvePath(BUNDLED_KEYS_DIR, GPG_KEY_NAME);
    log.info(`Downloading Elastic GPG key from ${gpgKeyUrl} to ${destination}`);

    try {
      await downloadToDisk({
        log,
        url: gpgKeyUrl,
        destination,
        shaChecksum: '',
        shaAlgorithm: 'sha512',
        skipChecksumCheck: true,
        maxAttempts: 3,
      });
    } catch (error) {
      log.warning(`Failed to download Elastic GPG key`);
      log.warning(error);
    }
  },
};
