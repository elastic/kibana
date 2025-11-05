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
  for (const name in to.typeDefinitions) {
    if (!Object.prototype.hasOwnProperty.call(to.typeDefinitions, name)) {
      continue;
    }
    const infoAfter = to.typeDefinitions[name];
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

        // check that no migrations have been removed
        if (
          (infoBefore.migrationVersions && !infoAfter.migrationVersions) ||
          !equal(infoAfter.migrationVersions, infoBefore.migrationVersions)
        ) {
          throw new Error(
            `❌ Modifications have been detected in the '${name}.migrations'. This property is deprected and no modifications are allowed.`
          );
        }

        // check that no model versions have been removed
        if (
          (infoBefore.modelVersions && !infoAfter.modelVersions) ||
          infoAfter.modelVersions.length < infoBefore.modelVersions.length
        ) {
          throw new Error(`❌ Some model versions have been deleted for SO type '${name}'.`);
        }

        // check that current changes don't define more than 1 new modelVersion
        if (infoAfter.modelVersions.length - infoBefore.modelVersions.length > 1) {
          throw new Error(
            `❌ The SO type '${name}' is defining two (or more) new model versions. Please refer to our troubleshooting guide: https://docs.elastic.dev/kibana-dev-docs/tutorials/saved-objects#troubleshooting`
          );
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
          .map<number>(({ version }) => {
            const parsed = parseInt(version, 10);
            if (isNaN(parsed)) {
              throw new Error(
                `❌ Invalid model version '${version}' for SO type '${name}'. Model versions must be consecutive integer numbers starting at 1.`
              );
            }
            return parsed;
          })
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
  }
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
