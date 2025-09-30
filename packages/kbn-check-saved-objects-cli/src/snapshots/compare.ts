/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import equal from 'fast-deep-equal';
import type { MigrationInfoRecord, MigrationSnapshot } from '../types';

export function assertValidUpdates({
  log,
  from,
  to,
}: {
  log: ToolingLog;
  from: MigrationSnapshot;
  to: MigrationSnapshot;
}) {
  log.info(`Checking SO type updates between base branch and current branch`);
  Object.entries(to.typeDefinitions).forEach(([name, infoAfter]) => {
    const infoBefore = from.typeDefinitions[name];
    if (!infoBefore) {
      log.debug(`New type defined: ${name}`);
    } else {
      // the type already exists
      if (equal(infoBefore, infoAfter)) {
        // the type has not changed
        log.debug(`The type '${name}' has NOT been updated.`);
      } else {
        // the type has changed
        log.info(`The type '${name}' has been updated.`);

        // check that no model versions have been removed
        if (infoAfter.modelVersions.length < infoBefore.modelVersions.length) {
          throw new Error(`❌ Some model versions have been deleted for SO type '${name}'.`);
        }

        // check that current changes don't define more than 1 new modelVersion
        if (infoAfter.modelVersions.length - infoBefore.modelVersions.length > 1) {
          throw new Error(`❌ The SO type '${name}' is defining two (or more) new model versions.`);
        }

        // check that existing model versions have not been mutated
        const mutatedModelVersions = getMutatedModelVersions(infoBefore, infoAfter);
        if (mutatedModelVersions.length > 0) {
          throw new Error(
            `❌ Some modelVersions have been updated for SO type '${name}' after they were defined: ${mutatedModelVersions}.`
          );
        }

        // check that defined modelVersions are consecutive integer numbers, starting at 1
        infoAfter.modelVersions
          .map<number>(({ version }) => parseInt(version, 10))
          .sort((a, b) => a - b)
          .forEach((versionNumber, index, list) => {
            if (versionNumber !== index + 1) {
              throw new Error(
                `❌ The '${name}' SO type is missing model version '${
                  index + 1
                }'. Model versions defined: ${list}`
              );
            }
          });

        // ensure that updates in mappings go together with a modelVersion bump
        if (
          mappingsUpdated(infoBefore, infoAfter) &&
          infoAfter.modelVersions.length === infoBefore.modelVersions.length
        ) {
          throw new Error(
            `❌ The '${name}' SO type has changes in the mappings, but is missing a modelVersion that defines these changes.`
          );
        }
      }
    }
  });
  log.info('✅ Current SO type definitions are compatible with the baseline');
}

function getMutatedModelVersions(
  infoBefore: MigrationInfoRecord,
  infoAfter: MigrationInfoRecord
): string[] {
  const mutatedModelVersions = infoBefore.modelVersions.filter(
    (summaryBefore, index) => !equal(summaryBefore, infoAfter.modelVersions[index])
  );
  return mutatedModelVersions.map(({ version }) => `10.${version}.0`);
}

function mappingsUpdated(infoBefore: MigrationInfoRecord, infoAfter: MigrationInfoRecord): boolean {
  return !equal(infoBefore.mappings, infoAfter.mappings);
}
