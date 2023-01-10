/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Command } from 'commander';
import deepEqual from 'fast-deep-equal';
import type { Client } from '@elastic/elasticsearch';
import { kibanaPackageJson } from '@kbn/repo-info';
import path from 'path';
import fs from 'fs';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import { functionTypeParam } from '@babel/types';
import { extractMappingsFromPlugins } from './extract_mappings_from_plugins';

const MY_INDEX = '.kibana';
const EXISTING_MAPPINGS_FILE = path.join(__dirname, 'current_mappings.json');

const program = new Command('bin/compatible-mappings-check');

function log(...msg: string[]): void {
  // eslint-disable-next-line no-console
  console.log(...msg);
}

function writeToMappingsFile(mappings: SavedObjectsTypeMappingDefinitions) {
  fs.writeFileSync(
    EXISTING_MAPPINGS_FILE,
    JSON.stringify(mappings, Object.keys(mappings).sort(), 2)
  );
}

/**
 * Algorithm for checking compatible mappings. Should work in CI or local
 * dev environment.
 *
 * 1. Extract mappings from code (JSON object) to file (next_mappings.json)
 * 4. Start a fresh ES node
 * 7. Upload current_mappings.json to ES node
 * 8. Upload mappings.json to ES node
 * 9. Check result of response to step 8, if bad response the mappings are incompatible
 */
program
  .version(kibanaPackageJson.version)
  .description(`Check whether this commit's SO mappings are compatible with latest from main`);

program.command('check').action(async () => {
  let errorEncountered = false;
  try {
    if (!fs.existsSync(EXISTING_MAPPINGS_FILE)) {
      log(
        `No existing mappings file found at ${EXISTING_MAPPINGS_FILE}. Run "generate" command first then retry this command.`
      );
      process.exit(1);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const currentMappings: SavedObjectsTypeMappingDefinitions = require(EXISTING_MAPPINGS_FILE);
    log('Extracting mappings from plugins...');
    const extractedMappings = await extractMappingsFromPlugins();
    log('Got mappings from plugins.');

    if (deepEqual(currentMappings, extractedMappings)) {
      log('Mappings are unchanged.');
      return;
    }

    const { startES } = createTestServers({ adjustTimeout: () => {} });
    const esServer = await startES();
    const esClient: Client = (esServer.es as any).getClient();

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

    try {
      const res = await esClient.indices.putMapping({
        index: MY_INDEX,
        properties: extractedMappings,
      });
      log('Extracted mappings are compatible with existing mappings!');
      log(JSON.stringify(res, null, 2));
      writeToMappingsFile(extractedMappings);
    } catch (e) {
      log('There was an issue trying to apply the extracted mappings to the existing index.');
      log(`Put mapping command failed with: ${e}`);
      errorEncountered = true;
    }
  } finally {
    const code = errorEncountered ? 1 : 0;
    log(`Exiting with code "${code}"...`);
    process.nextTick(() => {
      // Look like we have open handles (not sure what is causing it) so we are kind of ungraciously ending the process here
      process.exit(code);
    });
  }
});

program.command('generate').action(async () => {
  writeToMappingsFile(await extractMappingsFromPlugins());
  process.nextTick(() => {
    process.exit(0);
  });
});

program.parse(process.argv);
