/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import fs from 'fs';
import { Command } from 'commander';
import deepEqual from 'fast-deep-equal';
import { kibanaPackageJson } from '@kbn/repo-info';

import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import { extractMappingsFromPlugins } from './extract_mappings_from_plugins';
import { log, exit, writeToMappingsFile, CURRENT_MAPPINGS_FILE } from './util';

import { throwIfMappedFieldRemoved } from './check_additive_only_change';
import { throwIfMappingsAreIncompatible } from './check_incompatible_mappings';

const program = new Command('bin/compatible-mappings-check');

program
  .version(kibanaPackageJson.version)
  .description(`Check whether this commit's SO mappings are compatible with latest from main`);

const MY_INDEX = '.kibana_mappings_check';
program
  .command('check')
  .option('-d, --dryRun', 'Do not update the current mappings')
  .action(
    /**
     * Algorithm for checking compatible mappings. Should work in CI or local
     * dev environment.
     * 1. Extract mappings from code as JSON object
     * 2. Check if extracted mappings is different from current_mappings.json, current_mappings.json represents the mappings from "main"
     * 3. Start a fresh ES node
     * 4. Upload current_mappings.json to ES node
     * 5. Upload extracted mappings.json to ES node
     * 6. Check result of response to step 5, if bad response the mappings are incompatible
     * 7. If good response, write extracted mappings to current_mappings.json
     */
    async (options = {}) => {
      if (!fs.existsSync(CURRENT_MAPPINGS_FILE)) {
        log.error(
          `No existing mappings file found at ${CURRENT_MAPPINGS_FILE}. Run the "generateSnapshot" command then retry this command.`
        );
        exit(1);
        return;
      }
      let errorEncountered = false;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const currentMappings: SavedObjectsTypeMappingDefinitions = require(CURRENT_MAPPINGS_FILE);
        log.info('Extracting mappings from plugins...');
        const extractedMappings = await extractMappingsFromPlugins();
        log.info(`Got mappings for ${Object.keys(extractedMappings).length} types from plugins.`);

        if (deepEqual(currentMappings, extractedMappings)) {
          log.success('Mappings are unchanged.');
          return;
        }

        log.info('Checking for additive-only changes...');
        const { checkedCount: checkedProperties } = throwIfMappedFieldRemoved(
          currentMappings,
          extractedMappings
        );
        log.success(
          `Checked ${checkedProperties} existing properties. All present in extracted mappings.`
        );

        log.info(`Checking if mappings are compatible...`);
        const res = await throwIfMappingsAreIncompatible({
          index: MY_INDEX,
          nextMappings: extractedMappings,
          currentMappings,
        });

        log.success('Extracted mappings are compatible with existing mappings.');
        log.success(`Got response\n${JSON.stringify(res, null, 2)}`);
        if (options.dryRun) {
          log.info('Dry run detected, not updating current mappings file...');
        } else {
          log.info(`Writing extracted mappings to current mappings file ${CURRENT_MAPPINGS_FILE}.`);
          writeToMappingsFile(extractedMappings);
        }
      } catch (e) {
        log.error(
          'There was an issue trying to apply the extracted mappings to the existing index.'
        );
        log.error(`Error: ${e}`);
        log.error(
          `Only mappings changes that are compatible with current mappings are allowed. Consider reaching out to the Kibana core team if you are stuck.`
        );

        errorEncountered = true;
      } finally {
        const code = errorEncountered ? 1 : 0;
        (code ? log.error.bind(log) : log.success.bind(log))(`Exiting with code "${code}"...`);
        exit(code);
      }
    }
  );

program.command('generateSnapshot').action(async () => {
  log.info('Extracting mappings from plugins...');
  writeToMappingsFile(await extractMappingsFromPlugins());
  log.success(`Snapshot extracted and written to ${CURRENT_MAPPINGS_FILE}`);
  exit(0);
});

program.parse(process.argv);
