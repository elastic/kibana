/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import JSON5 from 'json5';

import { readCliArgs } from '../args';
import { Task, read, downloadToDisk } from '../lib';

const BUNDLED_PACKAGES_DIR = 'x-pack/plugins/fleet/target/bundled_packages';

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
    const eprUrl =
      buildOptions?.eprRegistry === 'snapshot'
        ? 'https://epr-snapshot.elastic.co'
        : 'https://epr.elastic.co';

    const configFilePath = config.resolveFromRepo('fleet_packages.json');
    const fleetPackages = (await read(configFilePath)) || '[]';

    const parsedFleetPackages: FleetPackage[] = JSON5.parse(fleetPackages);

    log.debug(
      `Found configured bundled packages: ${parsedFleetPackages
        .map((fleetPackage) => `${fleetPackage.name}-${fleetPackage.version}`)
        .join(', ')}`
    );

    await Promise.all(
      parsedFleetPackages.map(async (fleetPackage) => {
        const archivePath = `${fleetPackage.name}-${fleetPackage.version}.zip`;
        const archiveUrl = `${eprUrl}/epr/${fleetPackage.name}/${fleetPackage.name}-${fleetPackage.version}.zip`;

        const destination = build.resolvePath(BUNDLED_PACKAGES_DIR, archivePath);

        try {
          await downloadToDisk({
            log,
            url: archiveUrl,
            destination,
            shaChecksum: '',
            shaAlgorithm: 'sha512',
            skipChecksumCheck: true,
            maxAttempts: 3,
          });
        } catch (error) {
          log.warning(`Failed to download bundled package archive ${archivePath}`);
          log.warning(error);
        }
      })
    );
  },
};
