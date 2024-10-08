/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';

import { takeSnapshot } from './snapshot_plugin_types';

const scriptName = process.argv[1].replace(/^.*scripts\//, 'scripts/');
const DEFAULT_OUTPUT_PATH = 'target/plugin_so_types_snapshot.json';

run(
  async ({ log, flagsReader, procRunner }) => {
    const outputPath = flagsReader.string('outputPath') || DEFAULT_OUTPUT_PATH;

    const result = await takeSnapshot({ outputPath, log });

    return {
      outputPath,
      result,
      log,
    };
  },
  {
    usage: [process.argv0, scriptName, 'snapshot', '[--outputPath <outputPath>]'].join(' '),
    description: `Takes a snapshot of all Kibana plugin Saved Object migrations' information, in a JSON format.`,
    flags: {
      string: ['outputPath'],
      help: `
        --outputPath\tA path (absolute or relative to the repo root) where to output the snapshot of the SO migration info (default: ${DEFAULT_OUTPUT_PATH})
      `,
    },
  }
)
  .then((success) => {
    if (success) {
      success.log.info('Snapshot successfully taken to: ' + success.outputPath);
    }
    // Kibana won't stop because some async processes are stuck polling, we need to shut down the process.
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
