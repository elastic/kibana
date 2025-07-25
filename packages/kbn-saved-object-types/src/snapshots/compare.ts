/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import equal from 'fast-deep-equal';
import { MigrationInfoRecord, MigrationSnapshot } from '../types';

export async function assertValidUpdates({
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
          .sort()
          .forEach((versionNumber, index) => {
            if (versionNumber !== index + 1) {
              throw new Error(`❌ The '${name}' SO type is missing model version '${index}'.`);
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
