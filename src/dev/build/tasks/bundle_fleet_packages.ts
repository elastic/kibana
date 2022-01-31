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

interface FleetPackage {
  name: string;
  version: string;
  checksum: string;
  checksum_snapshot: string;
}

export const BundleFleetPackages: Task = {
  description: 'Bundling fleet packages',

  async run(config, log, build) {
    log.info('Fetching fleet packages from package registry');
    log.indent(4);

    // Support the `--use-snapshot-registry` command line argument to fetch from the snapshot registry
    // in development or test environments
    const { buildOptions } = readCliArgs(process.argv);
    const eprUrl = buildOptions?.useSnapshotRegistry
      ? 'https://epr-snapshot.elastic.co'
      : 'https://epr.elastic.co';

    const configFilePath = config.resolveFromRepo('fleet_packages.json');
    const fleetPackages = (await read(configFilePath)) || '[]';

    await Promise.all(
      JSON5.parse(fleetPackages).map(async (fleetPackage: FleetPackage) => {
        const archivePath = `${fleetPackage.name}-${fleetPackage.version}.zip`;
        const archiveUrl = `${eprUrl}/epr/${fleetPackage.name}/${fleetPackage.name}-${fleetPackage.version}.zip`;

        const destination = build.resolvePath(
          'x-pack/plugins/fleet/server/bundled_packages',
          archivePath
        );

        await downloadToDisk({
          log,
          url: archiveUrl,
          destination,
          shaChecksum: fleetPackage.checksum,
          shaAlgorithm: 'sha512',
          maxAttempts: 3,
        });
      })
    );
  },
};
