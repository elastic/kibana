/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import del from 'del';
import Axios from 'axios';
import { Task, downloadToDisk, downloadToString } from '../lib';

export const DownloadCloudDependencies: Task = {
  description: 'Downloading cloud dependencies',

  async run(config, log, build) {
    const downloadBeat = async (beat: string, id: string) => {
      const subdomain = config.isRelease ? 'artifacts' : 'snapshots';
      const version = config.getBuildVersion();
      const buildId = id.match(/[0-9]\.[0-9]\.[0-9]-[0-9a-z]{8}/);
      const buildIdUrl = buildId ? `${buildId[0]}/` : '';
      const architecture = process.arch === 'arm64' ? 'arm64' : 'x86_64';
      const url = `https://${subdomain}-no-kpi.elastic.co/${buildIdUrl}downloads/beats/${beat}/${beat}-${version}-linux-${architecture}.tar.gz`;
      const checksum = await downloadToString({ log, url: url + '.sha512', expectStatus: 200 });
      const destination = config.resolveFromRepo('.beats', Path.basename(url));
      return downloadToDisk({
        log,
        url,
        destination,
        shaChecksum: checksum.split(' ')[0],
        shaAlgorithm: 'sha512',
        maxAttempts: 3,
      });
    };

    let buildId = '';
    if (!config.isRelease) {
      const manifestUrl = `https://artifacts-api.elastic.co/v1/versions/${config.getBuildVersion()}/builds/latest`;
      try {
        const manifest = await Axios.get(manifestUrl);
        buildId = manifest.data.build.build_id;
      } catch (e) {
        log.error(
          `Unable to find Elastic artifacts for ${config.getBuildVersion()} at ${manifestUrl}.`
        );
        throw e;
      }
    }
    await del([config.resolveFromRepo('.beats')]);

    await downloadBeat('metricbeat', buildId);
    await downloadBeat('filebeat', buildId);
  },
};
