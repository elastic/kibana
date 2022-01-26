/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Task, read, downloadToDisk } from '../lib';

const EPR_URL = 'https://epr-snapshot.elastic.co';

interface FleetPackage {
  name: string;
  version: string;
  checksum: string;
}

export const BundleFleetPackages: Task = {
  description: 'Bundling fleet packages',

  async run(config, log, build) {
    log.info('Fetching fleet packages from package registry');
    log.indent(4);

    const configFilePath = config.resolveFromRepo('fleet_packages.json');
    const fleetPackages = (await read(configFilePath)) || '[]';

    await Promise.all(
      JSON.parse(fleetPackages).map(async (fleetPackage: FleetPackage) => {
        const archivePath = `${fleetPackage.name}-${fleetPackage.version}.zip`;
        const archiveUrl = `${EPR_URL}/epr/${fleetPackage.name}/${fleetPackage.name}-${fleetPackage.version}.zip`;

        const destination = config.resolveFromRepo(
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
