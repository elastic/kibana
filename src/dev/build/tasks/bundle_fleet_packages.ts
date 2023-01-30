/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import JSON5 from 'json5';
import fs from 'fs/promises';
import { safeLoad, safeDump } from 'js-yaml';

import { Task, read, downloadToDisk, unzipBuffer, createZipFile } from '../lib';

const BUNDLED_PACKAGES_DIR = 'x-pack/plugins/fleet/target/bundled_packages';

// Package storage v2 url
export const PACKAGE_STORAGE_REGISTRY_URL = 'https://epr.elastic.co';

interface FleetPackage {
  name: string;
  version: string;
  forceAlignStackVersion?: boolean;
}

export const BundleFleetPackages: Task = {
  description: 'Bundling fleet packages',

  async run(config, log, build) {
    log.info('Fetching fleet packages from package registry');
    log.indent(4);

    const configFilePath = config.resolveFromRepo('fleet_packages.json');
    const fleetPackages = (await read(configFilePath)) || '[]';

    const parsedFleetPackages: FleetPackage[] = JSON5.parse(fleetPackages);

    log.debug(
      `Found configured bundled packages: ${parsedFleetPackages
        .map((fleetPackage) => `${fleetPackage.name}-${fleetPackage.version || 'latest'}`)
        .join(', ')}`
    );

    await Promise.all(
      parsedFleetPackages.map(async (fleetPackage) => {
        const stackVersion = config.getBuildVersion();

        let versionToWrite = fleetPackage.version;

        // If `forceAlignStackVersion` is set, we will rewrite the version specified in the config
        // to the version of the stack when writing the bundled package to disk. This allows us
        // to support some unique package development workflows, e.g. APM.
        if (fleetPackage.forceAlignStackVersion) {
          versionToWrite = stackVersion;

          log.debug(
            `Bundling ${fleetPackage.name}-${fleetPackage.version} as ${fleetPackage.name}-${stackVersion} to align with stack version`
          );
        }

        const archivePath = `${fleetPackage.name}-${versionToWrite}.zip`;
        const archiveUrl = `${PACKAGE_STORAGE_REGISTRY_URL}/epr/${fleetPackage.name}/${fleetPackage.name}-${fleetPackage.version}.zip`;

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

          // If we're force aligning the version, we need to
          // 1. Unzip the downloaded archive
          // 2. Edit the `manifest.yml` file to include the updated `version` value
          // 3. Re-zip the archive and replace it on disk
          if (fleetPackage.forceAlignStackVersion) {
            const buffer = await fs.readFile(destination);
            const zipEntries = await unzipBuffer(buffer);

            const manifestPath = `${fleetPackage.name}-${fleetPackage.version}/manifest.yml`;
            const manifestEntry = zipEntries.find((entry) => entry.path === manifestPath);

            if (!manifestEntry || !manifestEntry.buffer) {
              log.debug(
                `Unable to find manifest.yml for stack aligned package ${fleetPackage.name}`
              );

              return;
            }

            const manifestYml = await safeLoad(manifestEntry.buffer.toString('utf8'));
            manifestYml.version = stackVersion;

            const newManifestYml = safeDump(manifestYml);
            manifestEntry.buffer = Buffer.from(newManifestYml, 'utf8');

            // Update all paths to use the new version
            zipEntries.forEach(
              (entry) => (entry.path = entry.path.replace(fleetPackage.version, versionToWrite!))
            );

            await createZipFile(zipEntries, destination);
          }
        } catch (error) {
          log.error(`Failed to download bundled package archive ${archivePath}`);
          throw error;
        }
      })
    );
  },
};
