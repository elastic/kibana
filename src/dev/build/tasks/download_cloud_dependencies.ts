/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import axios from 'axios';
import Path from 'path';
import del from 'del';
import { Task, download } from '../lib';

export const DownloadCloudDependencies: Task = {
  description: 'Downloading cloud dependencies',

  async run(config, log, build) {
    const downloadBeat = async (beat: string) => {
      const subdomain = config.isRelease ? 'artifacts' : 'snapshots';
      const version = config.getBuildVersion();
      const architecture = process.arch === 'arm64' ? 'arm64' : 'x86_64';
      const url = `https://${subdomain}-no-kpi.elastic.co/downloads/beats/${beat}/${beat}-${version}-linux-${architecture}.tar.gz`;
      const checksumRes = await axios.get(url + '.sha512');
      if (checksumRes.status !== 200) {
        throw new Error(`Unexpected status code ${checksumRes.status} when downloading ${url}`);
      }
      const destination = config.resolveFromRepo('.beats', Path.basename(url));
      return download({
        log,
        url,
        destination,
        shaChecksum: checksumRes.data.split(' ')[0],
        shaAlgorithm: 'sha512',
        retries: 3,
      });
    };

    await del([config.resolveFromRepo('.beats')]);
    await downloadBeat('metricbeat');
    await downloadBeat('filebeat');
  },
};
