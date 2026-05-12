/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, isAbsolute, resolve } from 'path';

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';

import { takeSnapshot } from '../snapshots';
import { getKibanaServer } from '../util';

const DEFAULT_OUTPUT_PATH = 'target/plugin_so_types_snapshot.json';

export const runSoMigrationSnapshotCli = () => {
  const scriptName = process.argv[1].replace(/^.*scripts\//, 'scripts/');

  run(
    async ({ log, flagsReader }) => {
      const outputPathArg = flagsReader.string('outputPath') ?? DEFAULT_OUTPUT_PATH;
      const outputPath = isAbsolute(outputPathArg)
        ? outputPathArg
        : resolve(REPO_ROOT, outputPathArg);

      const kibanaServer = await getKibanaServer();
      await kibanaServer.preboot();
      const coreSetup = await kibanaServer.setup();
      const types = coreSetup.savedObjects.getTypeRegistry().getAllTypes();
      const snapshot = await takeSnapshot(types);

      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, JSON.stringify(snapshot, null, 2), { encoding: 'utf-8' });

      log.info('Snapshot successfully taken to: ' + outputPath);
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
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
};
