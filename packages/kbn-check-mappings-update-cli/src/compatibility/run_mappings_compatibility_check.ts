/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { ToolingLog } from '@kbn/tooling-log';
import { CleanupTask } from '@kbn/dev-cli-runner';
import { createTestEsCluster } from '@kbn/test';
import { extractMappingsFromPlugins } from './extract_mappings_from_plugins';
import { checkAdditiveOnlyChange } from './check_additive_only_change';
import { checkIncompatibleMappings } from './check_incompatible_mappings';
import { readCurrentMappings, writeCurrentMappings } from './current_mappings';

export const runMappingsCompatibilityChecks = async ({
  fix,
  verify,
  log,
  addCleanupTask,
}: {
  fix: boolean;
  verify: boolean;
  log: ToolingLog;
  addCleanupTask: (task: CleanupTask) => void;
}) => {
  /**
   * Algorithm for checking compatible mappings. Should work in CI or local
   * dev environment.
   * 1. Extract mappings from code as JSON object
   * 2. Check if extracted mappings is different from current_mappings.json, current_mappings.json stores
   *    the mappings from upstream and is commited to each branch
   * 3. Start a fresh ES node
   * 4. Upload current_mappings.json to ES node
   * 5. Upload extracted mappings.json to ES node
   * 6. Check result of response to step 5, if bad response the mappings are incompatible
   * 7. If good response, write extracted mappings to current_mappings.json
   */

  log.info('Extracting mappings from plugins');
  const extractedMappings = await log.indent(4, async () => {
    return await extractMappingsFromPlugins(log);
  });

  const currentMappings = await readCurrentMappings();
  const isMappingChanged = !deepEqual(currentMappings, extractedMappings);

  if (!isMappingChanged) {
    log.success('Mappings are unchanged.');
    return;
  }

  if (verify) {
    log.info('Checking if any mappings have been removed');
    await log.indent(4, async () => {
      return checkAdditiveOnlyChange(log, currentMappings, extractedMappings);
    });

    log.info('Starting es...');
    const esClient = await log.indent(4, async () => {
      const cluster = createTestEsCluster({ log });
      await cluster.start();
      addCleanupTask(() => cluster.cleanup());
      return cluster.getClient();
    });

    log.info(`Checking if mappings are compatible`);
    await log.indent(4, async () => {
      await checkIncompatibleMappings({
        log,
        esClient,
        currentMappings,
        nextMappings: extractedMappings,
      });
    });
  }

  if (fix) {
    await writeCurrentMappings(extractedMappings);
    log.warning(
      `Updated extracted mappings in current_mappings.json file, please commit the changes if desired.`
    );
  } else {
    log.warning(
      `The extracted mappings do not match the current_mappings.json file, run with --fix to update.`
    );
  }
};
