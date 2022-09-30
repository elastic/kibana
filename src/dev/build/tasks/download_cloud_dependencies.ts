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
import Fsp from 'fs/promises';
import { Task, downloadToDisk, downloadToString } from '../lib';

export const DownloadCloudDependencies: Task = {
  description: 'Downloading cloud dependencies',

  async run(config, log, build) {
    const subdomain = config.isRelease ? 'artifacts-staging' : 'artifacts-snapshot';

    const downloadBeat = async (beat: string, id: string) => {
      const version = config.getBuildVersion();
      const localArchitecture = [process.arch === 'arm64' ? 'arm64' : 'x86_64'];
      const allArchitectures = ['arm64', 'x86_64'];
      const architectures = config.getDockerCrossCompile() ? allArchitectures : localArchitecture;
      const downloads = architectures.map(async (arch) => {
        const url = `https://${subdomain}.elastic.co/beats/${id}/downloads/beats/${beat}/${beat}-${version}-linux-${arch}.tar.gz`;
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
      });
      return Promise.all(downloads);
    };

    const writeManifest = async (manifestUrl: string, manifestJSON: object) => {
      const destination = config.resolveFromRepo('.beats', 'beats_manifest.json');
      return Fsp.writeFile(
        destination,
        JSON.stringify(
          {
            manifest_url: manifestUrl,
            ...manifestJSON,
          },
          null,
          2
        )
      );
    };

    let buildId = '';
    let manifestUrl = '';
    let manifestJSON = null;
    const buildUrl = `https://${subdomain}.elastic.co/beats/latest/${config.getBuildVersion()}.json`;
    try {
      const latest = await Axios.get(buildUrl);
      buildId = latest.data.build_id;
      manifestUrl = latest.data.manifest_url;
      manifestJSON = (await Axios.get(manifestUrl)).data;
      if (!(manifestUrl && manifestJSON)) throw new Error('Missing manifest.');
    } catch (e) {
      log.error(`Unable to find Beats artifacts for ${config.getBuildVersion()} at ${buildUrl}.`);
      throw e;
    }

    await del([config.resolveFromRepo('.beats')]);

    await downloadBeat('metricbeat', buildId);
    await downloadBeat('filebeat', buildId);

    await writeManifest(manifestUrl, manifestJSON);
  },
};
