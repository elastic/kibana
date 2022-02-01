/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import axios from 'axios';
import JSON5 from 'json5';

// @ts-expect-error untyped internal module used to prevent axios from using xhr adapter in tests
import AxiosHttpAdapter from 'axios/lib/adapters/http';

import { ToolingLog } from '@kbn/dev-utils';
import { closeSync, openSync, writeSync } from 'fs';
import { dirname } from 'path';
import { readCliArgs } from '../args';

import { Task, read, mkdirp } from '../lib';

const BUNDLED_PACKAGES_DIR = 'x-pack/plugins/fleet/server/bundled_packages';

interface FleetPackage {
  name: string;
  version: string;
}

export const BundleFleetPackages: Task = {
  description: 'Bundling fleet packages',

  async run(config, log, build) {
    log.info('Fetching fleet packages from package registry');
    log.indent(4);

    // Support the `--use-snapshot-epr` command line argument to fetch from the snapshot registry
    // in development or test environments
    const { buildOptions } = readCliArgs(process.argv);
    const eprUrl = buildOptions?.useSnapshotEpr
      ? 'https://epr-snapshot.elastic.co'
      : 'https://epr.elastic.co';

    const configFilePath = config.resolveFromRepo('fleet_packages.json');
    const fleetPackages = (await read(configFilePath)) || '[]';

    await Promise.all(
      JSON5.parse(fleetPackages).map(async (fleetPackage: FleetPackage) => {
        const archivePath = `${fleetPackage.name}-${fleetPackage.version}.zip`;
        const archiveUrl = `${eprUrl}/epr/${fleetPackage.name}/${fleetPackage.name}-${fleetPackage.version}.zip`;

        const destination = build.resolvePath(BUNDLED_PACKAGES_DIR, archivePath);

        try {
          await downloadPackageArchive({ log, url: archiveUrl, destination });
        } catch (error) {
          log.warning(`Failed to download bundled package archive ${archivePath}`);
          log.warning(error);
        }
      })
    );
  },
};

/**
 * We need to skip the checksum process on Fleet's bundled packages for now because we can't reliably generate
 * a consistent checksum for the `.zip` file returned from the EPR service. This download process should be updated
 * to verify packages using the proposed package signature field provided in https://github.com/elastic/elastic-package/issues/583
 */
async function downloadPackageArchive({
  log,
  url,
  destination,
}: {
  log: ToolingLog;
  url: string;
  destination: string;
}) {
  log.info(`Downloading bundled package from ${url}`);

  await mkdirp(dirname(destination));
  const file = openSync(destination, 'w');

  try {
    const response = await axios.request({
      url,
      responseType: 'stream',
      adapter: AxiosHttpAdapter,
    });

    await new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        writeSync(file, chunk);
      });

      response.data.on('error', reject);
      response.data.on('end', resolve);
    });
  } catch (error) {
    log.warning(`Error downloading bundled package from ${url}`);
    log.warning(error);
  } finally {
    closeSync(file);
  }
}
