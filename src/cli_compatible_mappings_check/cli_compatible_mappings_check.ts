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
import type { Client } from '@elastic/elasticsearch';
import { kibanaPackageJson } from '@kbn/repo-info';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import { extractMappingsFromPlugins } from './extract_mappings_from_plugins';
import { CURRENT_MAPPINGS_FILE, exit, log, writeToMappingsFile } from './util';

const program = new Command('bin/compatible-mappings-check');

async function startES(): Promise<Client> {
  const servers = createTestServers({ adjustTimeout: () => {} });
  const esServer = await servers.startES();
  return (esServer.es as any).getClient();
}

program
  .version(kibanaPackageJson.version)
  .description(`Check whether this commit's SO mappings are compatible with latest from main`);

const MY_INDEX = '.kibana_mappings_check';
program.command('check').action(
  /**
   * Algorithm for checking compatible mappings. Should work in CI or local
   * dev environment.
   *
   * 1. Extract mappings from code as JSON object
   * 2. Check if extracted mappings is different from current_mappings.json, current_mappings.json represents the mappings from "main"
   * 3. Start a fresh ES node
   * 4. Upload current_mappings.json to ES node
   * 5. Upload extracted mappings.json to ES node
   * 6. Check result of response to step 8, if bad response the mappings are incompatible
   * 7. If good response, write extracted mappings to current_mappings.json
   */
  async () => {
    if (!fs.existsSync(CURRENT_MAPPINGS_FILE)) {
      log.fatal(
        `No existing mappings file found at ${CURRENT_MAPPINGS_FILE}. Run the "generate" command then retry this command.`
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
      log.info(`Got mappings from plugins.`);

      if (deepEqual(currentMappings, extractedMappings)) {
        log.success('Mappings are unchanged.');
        return;
      }

      const esClient = await startES();

      await esClient.indices.create({
        index: MY_INDEX,
        mappings: {
          properties: currentMappings,
        },
        settings: {
          mapping: {
            total_fields: { limit: 1500 },
          },
        },
      });

      const res = await esClient.indices.putMapping({
        index: MY_INDEX,
        properties: extractedMappings,
      });

      log.success('Extracted mappings are compatible with existing mappings!');
      log.success(`Got response\n${JSON.stringify(res, null, 2)}`);
      writeToMappingsFile(extractedMappings);
    } catch (e) {
      log.fatal('There was an issue trying to apply the extracted mappings to the existing index.');
      log.fatal(`Error: ${e}`);
      log.fatal(`Consider reaching out to the Kibana core team if you are stuck.`);
      errorEncountered = true;
    } finally {
      const code = errorEncountered ? 1 : 0;
      (code ? log.fatal : log.success)(`Exiting with code "${code}"...`);
      exit(code);
    }
  }
);

program.command('generate').action(async () => {
  log.info(`Extracting mappings from plugins and writing to ${CURRENT_MAPPINGS_FILE}...`);
  writeToMappingsFile(await extractMappingsFromPlugins());
  log.success(`Done!`);
  exit(0);
});

program.parse(process.argv);
